import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Panel1Map from './pages/panels/Cartografiar'
import Panel2Calibration from './pages/panels/Calibrar'
import Panel3SPDSite from './pages/panels/SPD_yacimineto'
import Panel4SPDIsland from './pages/panels/SDP_isla'
import Panel5Paleodemography from './pages/panels/SPD_yacimineto'
import GuidePage from './pages/panels/Guia'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                 element={<HomePage />} />
        <Route path="/mapa"             element={<Panel1Map />} />
        <Route path="/calibracion"      element={<Panel2Calibration />} />
        <Route path="/spd-yacimiento"   element={<Panel3SPDSite />} />
        <Route path="/spd-isla"         element={<Panel4SPDIsland />} />
        <Route path="/paleodemografia"  element={<Panel5Paleodemography />} />
        <Route path="/guia"             element={<GuidePage />} />
      </Routes>
    </BrowserRouter>
  )
}