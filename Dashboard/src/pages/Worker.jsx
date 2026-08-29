import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Worker.css'
import { useParams } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

function Worker() {
    const { uuid } = useParams()

    const [worker, setWorker] = useState(null)
    const [movement, setMovement] = useState([])

  
    useEffect(() => {

    // grab total number of workers
    async function getWorker() {

        const { data, error } = await supabase
            .from('users')
            .select('uuid, name, region')
            .eq('uuid', uuid)
            .single()


        if (error) {
            console.error(error)
            return
        }

        setWorker(data)
    }

    async function getMovement() {

        const ten_minutes = new Date(
            Date.now() - 10 * 60 * 1000
        ).toISOString()

        const { data, error } = await supabase
            .from('logs')
            .select('time_stamp, gyro_x, gyro_y, gyro_z, acc_x, acc_y, acc_z')
            .eq('device_uuid', uuid)
            .gte('time_stamp', ten_minutes)
            .order('time_stamp', { ascending: true })

        if (error) {
            console.error(error)
            return
        }

        setMovement(data)
    }


    getWorker()
    getMovement()

    }, [uuid])

    const chartData = movement
        .filter((_, index) => index % 50 === 0)
        .map((reading) => ({
        ...reading,
        time: new Date(reading.time_stamp).toLocaleTimeString('en-SG', {
            minute: '2-digit',
            second: '2-digit'
        })
    }))

    if (!worker) {
        return <p>Loading...</p>
    }

  
  return (
    <main>

      {/* header */}
      <nav>
        <a className="nav-name" href="/">
            DEP-Dashboard
        </a>
      </nav>

      {/* Worker Name */}
      <section>
        <h1>{worker.name}</h1>

        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />

                <Line
                    type="monotone"
                    dataKey="ax"
                    name="X"
                    dot={false}
                />

                <Line
                    type="monotone"
                    dataKey="ay"
                    name="Y"
                    dot={false}
                />

                <Line
                    type="monotone"
                    dataKey="az"
                    name="Z"
                    dot={false}
                />

            </LineChart>

        </ResponsiveContainer>
        

      </section>

      
    </main>
  )
}

export default Worker