import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AdminDashboard from './pages/AdminDashboard'
import OrderTracking from './pages/OrderTracking'
import Login from './pages/Login'
import DigitalDisplay from './pages/DigitalDisplay'
// import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/order/:id" element={<OrderTracking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/display" element={<DigitalDisplay />} />
      </Routes>
      {/* <Toaster /> */}
    </BrowserRouter>
  )
}

export default App
