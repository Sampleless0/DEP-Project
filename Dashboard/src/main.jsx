import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

import App from './App.jsx'
import Workers from './pages/Workers.jsx'
import Regions from './pages/Regions.jsx'
import Alerts from './pages/Alerts.jsx'
import Worker from './pages/Worker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<App />}/>
        <Route path='/workers' element={<Workers />}/>
        <Route path='/regions' element={<Regions />}/>
        <Route path='/alerts' element={<Alerts />}/>
        <Route path='/worker/:uuid' element={<Worker />}/>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
