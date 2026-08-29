import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client
from bleak import BleakScanner, BleakClient
import struct
import numpy as np
import keras
from datetime import datetime, timezone, timedelta
from pathlib import Path



load_dotenv()

# configuration
data_characteristic_uuid = '9183e416-6360-444d-9c32-05a20fe7e629'
info_characteristic_uuid = 'a0b37ad3-371d-41be-bc3f-6bb0d7fd1b9c'
alert_characteristic_uuid = '4e601d9a-973d-463a-84b1-e0ac69e7d3ef'

version_path = Path('Neural Network/Models/Fall_Detector_V3')

model_path = version_path / 'model.keras'
mean_path = version_path / 'mean.npy'
std_path = version_path / 'std.npy'

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

supabase = create_client(
    supabase_url,
    supabase_key
)


model = keras.saving.load_model(model_path)
mean = np.load(mean_path)
std = np.load(std_path)

class Tracker:
    def __init__(self, device, worker):
        self.device = device
        self.uuid = worker['uuid']
        self.name = worker['name']
        self.region = worker['region']

        self.client = None
        self.window = [[], []]

        self.connected = False


    def notification_handler(self, characteristic, data):
        try:
            num_floats = len(data) // 4
            
            values = struct.unpack(f'{num_floats}f', data)
            # returns (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, ...)

            for i in range(0, num_floats, 6):
                self.window[1].append(list(values[i:i+6]))

            # check for above 200 packets
            if len(self.window[1]) >= 100:

                if len(self.window[0]) != 0:
                    # sent for analysis and upload
                    self.analyse_packet(self.window)

                    asyncio.create_task(
                        self.upload_packet(self.window[0])
                    )

                self.window.pop(0)
                self.window.append([])

        except Exception as e:
            print(e)



    async def connect(self):
        try:

            async with BleakClient(
                self.device
            ) as client:

                self.client = client
                self.connected = True

                print(self.name, 'connected')


                await self.send_name()

                await client.start_notify(
                    data_characteristic_uuid,
                    self.notification_handler
                )

                while self.connected:
                    await asyncio.sleep(0.1)

                
        except Exception as e:
            print(e)

        finally:
        
            self.connected = False
            self.client = None

    async def send_name(self):
    
        if not self.client:
            return

        await self.client.write_gatt_char(
            info_characteristic_uuid,
            self.name.encode("utf-8"),
            response=True
        )

    async def send_alert(self, alert):

        if not self.client:
            return

        message = f"{alert},{self.name}"

        await self.client.write_gatt_char(
            alert_characteristic_uuid,
            message.encode("utf-8"),
            response=True
        )

    def analyse_packet(self, window):
        # merge both parts first
        merged_window = [value for one_window in window for value in one_window]

        process_window = np.array(merged_window, dtype=np.float32)
        process_window = np.expand_dims(process_window, axis=0)
        # (1,200,6)

        x_test = (process_window - mean) / std

        prediction = model.predict(x_test, verbose = 0)

        predicted_class = int(np.argmax(prediction[0]))

        classes = [
            "normal",
            "near_fall",
            "fall"
        ]

        alert = classes[predicted_class]

        if alert == "fall":
            asyncio.create_task(
                self.send_alert("fall")
            )

            asyncio.create_task(
                self.upload_alert("fall", window)
            )

        elif alert == "near_fall":
            asyncio.create_task(
                self.send_alert("near_fall")
            )

            asyncio.create_task(
                self.upload_alert("near_fall", window)
            )

        
    async def upload_packet(self, window):

        now = datetime.now(timezone.utc)

        rows = []

        for index, sample in enumerate(window):
            timestamp = (now - (len(window) - 1 - index) * timedelta(seconds=0.02))

            rows.append({
                'time_stamp' : timestamp.isoformat(),
                'device_uuid' : self.uuid,
                'acc_x' : sample[0],
                'acc_y' : sample[1],
                'acc_z' : sample[2],
                'gyro_x' : sample[3],
                'gyro_y' : sample[4],
                'gyro_z' : sample[5]
            })

        try:
            supabase.table(
                'logs'
            ).insert(rows).execute()
        except Exception as e:
            print(e)

    async def upload_alert(self, alert_type, window):

        now = datetime.now(timezone.utc)

        rows = {
            'device_uuid': self.uuid,
            'time_stamp': now.isoformat(),
            'type': alert_type,
            'logs': {
                'samples': [
                    {
                        'ax': float(sample[0]),
                        'ay': float(sample[1]),
                        'az': float(sample[2]),
                        'gx': float(sample[3]),
                        'gy': float(sample[4]),
                        'gz': float(sample[5])
                    }
                    for sample in window
                ]
            }
        }

        try:
            supabase.table('alerts').insert(rows).execute()

        except Exception as e:
            print(e)




async def get_workers():


    response = (
        supabase
        .table('users')
        .select('uuid, name, region')
        .execute()
    )

    return response.data

async def find_devices(workers):

    discovered = await BleakScanner.discover(
        timeout = 10,
        return_adv = True
    )

    trackers = []

    # create a dict with the workers
    workers_by_uuid = {
        worker['uuid'].lower() : worker for worker in workers
    }

    for device, advertisement in discovered.values():

        for worker_uuid, worker in workers_by_uuid.items():

            service_uuids = [
                service_uuid.lower() for service_uuid in (advertisement.service_uuids or [])
            ]

            if worker_uuid in service_uuids:
                print('found worker')

                trackers.append(Tracker(
                    device = device,
                    worker = worker
                ))

                break

    return trackers


async def main():

    print('program started')

    workers = await get_workers()

    print('workers loaded', len(workers))

    trackers = await find_devices(workers)

    print('trackers found', len(trackers))

    tasks = [
        asyncio.create_task(tracker.connect()) for tracker in trackers
    ]

    await asyncio.gather(*tasks)



asyncio.run(main())