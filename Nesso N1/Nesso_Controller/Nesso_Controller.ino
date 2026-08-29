#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <Arduino_Nesso_N1.h>
#include <Arduino_BMI270_BMM150.h>
#include <M5GFX.h>

// hardware
M5GFX display;
NessoBattery battery;

// configuration

// setup our tracker
const char* device_uuid = "db830d93-ea39-421e-87c4-0036bb026f10";

String name = "Unknown";


// sampling rate
const unsigned long sample_interval = 20; // 20ms
const int window_size = 5;
const unsigned long battery_update_interval = 1000; // 1s
const unsigned long advertising_check_interval = 250; // 250ms
const unsigned long alert_timeout = 10000; // 10s
const unsigned long flash_interval = 300; // 300ms




// timing variables
unsigned long current_time = 0;
unsigned long last_sample = 0;
unsigned long last_battery_update = 0;
unsigned long last_advertising_check = 0;

// sensor data

float acc_x, acc_y, acc_z;
float gyro_x, gyro_y, gyro_z;

struct Sample {
  float ax;
  float ay;
  float az;
  float gx;
  float gy;
  float gz;
};

Sample window[window_size];

int sample_index = 0;

// battery data
uint16_t charge_level = 0;
bool charging = false;


// device info
enum class BLEState {
  advertising,
  connected,
  disconnected
};

BLEState ble_state = BLEState::disconnected;


// display
enum class DisplayState {
  normal,
  nearby_fall,
  near_fall,
  fall
};

DisplayState display_state = DisplayState::normal;

unsigned long last_alert = 0;
int num_flash = 0;
bool flash_active = false;
unsigned long flash_start = 0;
uint16_t flash_colour = TFT_WHITE;
String nearby_fall_name = "";




BLEServer *pServer = nullptr;
BLEAdvertising *pAdvertising = nullptr;





// advertising channels

// sender
BLECharacteristic data_characteristic(
  "9183e416-6360-444d-9c32-05a20fe7e629",
  BLECharacteristic::PROPERTY_NOTIFY
);

BLEDescriptor data_descriptor(
  BLEUUID((uint16_t)0x2902)
);

// info receiver
BLECharacteristic info_characteristic(
  "a0b37ad3-371d-41be-bc3f-6bb0d7fd1b9c",
  BLECharacteristic::PROPERTY_WRITE
);

// alert receiver
BLECharacteristic alert_characteristic(
  "4e601d9a-973d-463a-84b1-e0ac69e7d3ef",
  BLECharacteristic::PROPERTY_WRITE
);







void init_display() {
  // (135, 240)
  // coloured border
  display.fillScreen(TFT_BLUE);
  display.fillRect(10, 10, 115, 220, TFT_BLACK);
  
  display.setTextSize(1.5);

  // name and battery
  display.setTextDatum(TL_DATUM);
  display.drawString("Name: ", 15, 15);
  display.drawString(name, 80, 15);

  display.drawString("Battery: ", 15, 50);

  // status
  display.setTextDatum(MC_DATUM);
  display.drawString("Status:", 67, 120);
}



void display_flash() {
  // check if flash started
  current_time = millis();

  if (current_time - flash_start < flash_interval)
    return;

  
  flash_start = millis();

  if (!flash_active) {
    display.fillScreen(flash_colour);

    flash_active = true;
    return;
  }
  
  num_flash--;
  flash_active = false;
  init_display();

  if (num_flash <= 0) {
    update_display();
  }
}



void update_display() {
  
  // if flash
  if (num_flash > 0) {
    display_flash();
    return;
  }

  // battery
  display.fillRect(80, 50, 140, 20, TFT_BLACK);
  display.setTextDatum(TL_DATUM);
  display.drawString(String(charge_level) + "%" + (charging ? " Charging" : ""), 80, 50);

  // status
  display.fillRect(15, 160, 200, 20, TFT_BLACK);
  display.setTextDatum(MC_DATUM);

  switch (display_state) {
    case DisplayState::normal:
      display.drawString("Normal", 85, 165);
      break;

    case DisplayState::nearby_fall:
      display.drawString("Nearby Fall Alert!", 85, 165);
      break;

    case DisplayState::near_fall:
      display.drawString("Near Fall Alert!!", 85, 165);
      break;

    case DisplayState::fall:
      display.drawString("FALL ALERT!!!", 85, 165);
      break;

  }
  

}

// connection / disconnection
class server_callback: public BLEServerCallbacks {

  // connect
  void onConnect(BLEServer * pServer) {
    ble_state = BLEState::connected;

    Serial.println("[server] connected");

    update_display();
  }

  // disconnect
  void onDisconnect(BLEServer * pServer) {
    ble_state = BLEState::disconnected;

    Serial.println("[server] disconnected");

    // restart advertising
    pAdvertising->stop();
    pAdvertising->start();
    ble_state = BLEState::advertising;

    update_display();
  }

};

// gather info
class info_callback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String message = String(pCharacteristic->getValue().c_str());

    name = message;

    update_display();
  }
};

// alert
class alert_callback: public BLECharacteristicCallbacks {

  // write
  void onWrite(BLECharacteristic * pCharacteristic) {
    // obtain message
    String message = String(pCharacteristic->getValue().c_str());

    // find index of ,
    int comma = message.indexOf(",");

    // alert, name
    String alert = message.substring(0, comma);
    String name = message.substring(comma + 1);

    if (display_state == DisplayState::fall)
      return;

    if (display_state != DisplayState::normal && alert == "nearby_fall")
      return;
  
    // check alert type
    if (alert == "fall") {
      display_state = DisplayState::fall;
    } else if (alert == "near_fall" && (display_state != DisplayState::fall)) {
      display_state = DisplayState::near_fall;
    } else if (alert == "nearby_fall" && (display_state == DisplayState::normal)) {
      display_state = DisplayState::nearby_fall;
      nearby_fall_name = name;
    } else {
      return;
    }
   
    last_alert = millis();
    update_display();
  }
};




// initialise ble
void init_nesso() {
  Serial.println("initialising");

  // setup device
  BLEDevice::init(name);

  // configure max packet size
  BLEDevice::setMTU(200);

  // create server
  pServer = BLEDevice::createServer();

  BLEService *bmiService = pServer->createService(device_uuid);

  pServer->setCallbacks(new server_callback());

  // add characteristics
  bmiService->addCharacteristic(&data_characteristic);
  bmiService->addCharacteristic(&info_characteristic);
  bmiService->addCharacteristic(&alert_characteristic);
  
  data_descriptor.setValue("acc and gyro");
  data_characteristic.addDescriptor(&data_descriptor);
  info_characteristic.setCallbacks(new info_callback());
  alert_characteristic.setCallbacks(new alert_callback());


  // start
  bmiService->start();


  // advertising object
  pAdvertising = BLEDevice::getAdvertising();

  // configure advertisment
  pAdvertising->addServiceUUID(device_uuid);
  pAdvertising->setScanResponse(true);

  // start advertisement
  pAdvertising->start();
  ble_state = BLEState::advertising;
}






// actual main

void setup() {

  // setup battery
  battery.begin();
  battery.enableCharge();

  // serial
  Serial.begin(115200);
  delay(1000);
  Serial.println("[yes] program started");

  // setup imu
  if (!IMU.begin()) {
    Serial.println("Imu Setup failed");
    while (true);
  }

  Serial.println("Imu Setup complete");

  // display
  display.begin();
  display.setRotation(0);

  init_display();
  init_nesso();

  delay(1000);
}



// send data
void send(const Sample window[]) {
  data_characteristic.setValue(
    (uint8_t*)window,
    sizeof(Sample) * window_size
  );
  data_characteristic.notify();
}

// main loop


void loop() {

  // current time in ms
  current_time = millis();

  // display if currently in a flash
  if (num_flash > 0) {
    update_display();
  }

  // check if alert timeout
  if (display_state != DisplayState::normal && (current_time - last_alert >= alert_timeout)) {
    display_state = DisplayState::normal;
    update_display();
  }

  // update battery
  if (current_time - last_battery_update >= battery_update_interval) {
    charge_level = battery.getChargeLevel();
    charging = (battery.getChargeStatus() == NessoBattery::CHARGING);

    last_battery_update = current_time;
    update_display();
  }

  // check if not connected
  if (ble_state != BLEState::connected)
    return;

  // check if sensor not ready
  if (current_time - last_sample < sample_interval)
    return;

  // check if acc and gyro is valid
  if (!IMU.accelerationAvailable())
    return;

  if (!IMU.gyroscopeAvailable())
    return;


  // if everything works

  // update values
  last_sample += sample_interval;
  IMU.readAcceleration(acc_x, acc_y, acc_z);
  IMU.readGyroscope(gyro_x, gyro_y, gyro_z);


  // add to window
  window[sample_index].ax = -acc_z;
  window[sample_index].ay = -acc_x;
  window[sample_index].az = acc_y;
  window[sample_index].gx = -gyro_z;
  window[sample_index].gy = -gyro_x;
  window[sample_index].gz = gyro_y;
  
  sample_index++;

  // check if window full
  if (sample_index >= window_size) {
    send(window);

    sample_index = 0;
  }
}







