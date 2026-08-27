import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Workers.css'

function Workers() {
  const [workers, setWorkers] = useState([])

  
  useEffect(() => {

    // grab total number of workers
    async function getWorkers() {

      const { data, error } = await supabase
        .from('users')
        .select('uuid, name, region')
        .order('region', { ascending: true })
        .order('name', { ascending: true })


      if (error) {
        console.error(error)
        return
      }

      setWorkers(data)
    }


    getWorkers()

  }, [])

  const workersByRegion = workers.reduce((groups, worker) => {
    const region = worker.region || 'Unknown'

    if (!groups[region]) {
      groups[region] = []
    }

    groups[region].push(worker)

    return groups
  }, {})





  
  return (
    <main>

      {/* header */}
      <nav>
        <a className="nav-name" href="/">
            DEP-Dashboard
        </a>
      </nav>

      {/* All Workers */}
      <section>
        <h1>All Workers</h1>

        {Object.entries(workersByRegion).map(([region, workers]) => (
            <section className='workers-grid' key={region}>
            <h2>{region}</h2>

            <table>
                <thead>
                <tr>
                    <th>Name</th>
                    <th>UUID</th>
                </tr>
                </thead>

                <tbody>
                {workers.map((worker) => (
                    <tr key={worker.uuid}>
                    <td>{worker.name}</td>
                    <td>{worker.uuid}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            </section>
        ))}

      </section>

      
    </main>
  )
}

export default Workers