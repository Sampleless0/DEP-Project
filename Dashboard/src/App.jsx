import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [totalRegions, setTotalRegions] = useState(0)
  const [totalWorkers, setTotalWorkers] = useState(0)
  const [totalAlerts, setTotalAlerts] = useState(0)
  const [alerts, setAlerts] = useState([])

  
  useEffect(() => {

    // grab total number of regions
    async function getRegions() {

      const { data, error } = await supabase.rpc('total_regions')

      if (error) {
        console.error(error)
        return
      }

      setTotalRegions(data)
    }

    // grab total number of workers
    async function getWorkers() {

      const { data, error } = await supabase.rpc('total_names')

      if (error) {
        console.error(error)
        return
      }

      setTotalWorkers(data)
    }

    // grab total number of alerts over the week
    async function getAlerts() {

      const { data, error } = await supabase.rpc('total_alerts_weekly')

      if (error) {
        console.error(error)
        return
      }

      setTotalAlerts(data)
    }

    // grab alert rows
    async function getAlertRows() {

      const { data, error } = await supabase
        .from('alerts')
        .select(`
          uuid,
          time_stamp,
          type,
          users (
            name,
            region
          )
        `)
        .gte('time_stamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('time_stamp', { ascending: false })
        .limit(10)

      if (error) {
        console.error(error)
        return
      }

      setAlerts(data)
    }



    getRegions()
    getWorkers()
    getAlerts()

    getAlertRows() 

  }, [])







  
  return (
    <main>

      {/* header */}
      <nav>
        <a className="nav-name" href="/">
            DEP-Dashboard
        </a>
      </nav>

      {/* dropdown (user) */}
      <h1>hello</h1>


      {/* cards */}
      <section className='cards-grid'>

        <a className='card button' href='/regions'>
          <h2>Total Regions</h2>
          <p>{totalRegions}</p>
        </a>

        <a className='card button' href='/workers'>
          <h2>Total Workers</h2>
          <p>{totalWorkers}</p>
        </a>

        <a className='card button' href='/alerts'>
          <h2>Recent Alerts</h2>
          <p>{totalAlerts}</p>
        </a>

      </section>

      {/* recent alerts */}
      <section>
        <h1>Recent Alerts</h1>

        <table className='alerts-grid'>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Region</th>
              <th>Time Stamp</th>
              <th>Alert Type</th>
            </tr>
          </thead>

        
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.uuid}>
                <td>{alert.users.name}</td>
                <td>{alert.users.region}</td>
                <td>{new Date(alert.time_stamp).toLocaleString('en-SG')}</td>
                <td>{alert.type}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </section>

      
    </main>
  )
}

export default App
