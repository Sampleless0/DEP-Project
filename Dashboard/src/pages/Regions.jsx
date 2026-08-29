import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Regions.css'

function Regions() {
  const [regions, setRegions] = useState([])

  
  useEffect(() => {

    // grab total regions
    async function getRegions() {

      const { data, error } = await supabase.rpc('total_names_per_region')

      if (error) {
        console.error(error)
        return
      }

      setRegions(data)
    }


    getRegions()

  }, [])




  
  return (
    <main>

      {/* header */}
      <nav>
        <a className="nav-name" href="/">
            DEP-Dashboard
        </a>
      </nav>

      {/* All Regions */}
      <section>
        <h1>All Regions</h1>

        {regions.map((region) => (
            <section className='regions-grid' key={region.region}>
            <h2>{region.region}</h2>

            <span>{region.worker_count} workers</span>
            </section>
        ))}

      </section>

      
    </main>
  )
}

export default Regions