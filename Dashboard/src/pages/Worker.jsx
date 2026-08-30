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

        console.log("URL uuid:", uuid)
        console.log("movement query start:", ten_minutes)

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

    console.log("movement:", movement)
    console.log("chartData:", chartData)

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

        <div className='graph-grid'>

            <div className='graph-box'>
                <h2>Acceleration</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />

                        <Line
                            type="monotone"
                            dataKey="acc_x"
                            name="X"
                            stroke='#ea4335'
                            dot={false}
                        />

                        <Line
                            type="monotone"
                            dataKey="acc_y"
                            name="Y"
                            stroke='#86efac'
                            dot={false}
                        />

                        <Line
                            type="monotone"
                            dataKey="acc_z"
                            name="Z"
                            stroke='#7dd3fc'
                            dot={false}
                    />

                </LineChart>

                </ResponsiveContainer>
            </div>

            <div className='graph-box'>
                <h2>Gyroscope</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />

                        <Line
                            type="monotone"
                            dataKey="gyro_x"
                            name="X"
                            stroke='#ea4335'
                            dot={false}
                        />

                        <Line
                            type="monotone"
                            dataKey="gyro_y"
                            name="Y"
                            stroke='#86efac'
                            dot={false}
                        />

                        <Line
                            type="monotone"
                            dataKey="gyro_z"
                            name="Z"
                            stroke='#7dd3fc'
                            dot={false}
                        />

                    </LineChart>

                </ResponsiveContainer>
            </div>
        </div>

      </section>

      
    </main>
  )
}

export default Worker