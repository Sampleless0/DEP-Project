import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Alerts.css'

function Alerts() {
  const [alerts, setAlerts] = useState([])

  
  useEffect(() => {

    // grab alert rows
    async function getAlertRows() {

      const { data, error } = await supabase
        .from('alerts')
        .select(`
          time_stamp,
          type,
          users (
            name,
            region
          )
        `)
        .order('time_stamp', { ascending: false })

      if (error) {
        console.error(error)
        return
      }

      setAlerts(data)
    }


    getAlertRows()


  }, {})





  
  return (
    <main>

      {/* header */}
      <nav>
        <a className="nav-name" href="/">
            DEP-Dashboard
        </a>
      </nav>

      {/* All Alerts */}
      <section>
        <h1>All Alerts</h1>

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

export default Alerts