import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [totalRegions, setTotalRegions] = useState(0)
  const [totalWorkers, setTotalWorkers] = useState(0)
  const [totalAlerts, setTotalAlerts] = useState(0)

  
  useEffect(() => {

    // grab total number of regions
    async function getRegions() {

      const { data, error } = await supabase
        .rpc('total_regions')

        console.log('data:', data)
        console.log('error:', error)

      if (error) {
        console.error(error)
        return
      }

      setTotalRegions(data)
    }

    // grab total number of workers
    async function getWorkers() {

      const { data, error } = await supabase
        .rpc('total_names')

        console.log('data:', data)
        console.log('error:', error)

      if (error) {
        console.error(error)
        return
      }

      setTotalWorkers(data)
    }

    // grab total number of alerts over the week
    async function getAlerts() {

      const { data, error } = await supabase
        .rpc('total_alerts_week')

        console.log('data:', data)
        console.log('error:', error)

      if (error) {
        console.error(error)
        return
      }

      setTotalAlerts(data)
    }



    getRegions()
    getWorkers()
    getAlerts()

  }, [])







  
  return (
    <main>

      {/* header */}
      <nav>
        <a className="nav-name" href="#introduction">
            DEP-Dashboard
        </a>
      </nav>

      {/* dropdown (user) */}
      <h1>hello</h1>


      {/* cards */}
      <section className='cards-grid'>

        <div className='card'>
          <h2>Total Regions</h2>
          <p>{totalRegions}</p>
        </div>

        <div className='card'>
          <h2>Total Workers</h2>
          <p>{totalWorkers}</p>
        </div>

        <div className='card'>
          <h2>Total Alerts</h2>
          <p>{totalAlerts}</p>
        </div>

      </section>



      
    </main>
  )
}

export default App
