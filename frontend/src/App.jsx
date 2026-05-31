import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import CustomerOrder from './pages/CustomerOrder.jsx'
import CustomerToken from './pages/CustomerToken.jsx'
import StaffQueue from './pages/StaffQueue.jsx'
import StaffStats from './pages/StaffStats.jsx'
import './App.css'

export default function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  return (
    <div className="app-wrap">
      {!isHome && <NavBar />}
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/order"       element={<CustomerOrder />} />
        <Route path="/token"       element={<CustomerToken />} />
        <Route path="/staff/queue" element={<StaffQueue />} />
        <Route path="/staff/stats" element={<StaffStats />} />
      </Routes>
    </div>
  )
}

function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isStaff  = location.pathname.startsWith('/staff')
  return (
    <nav className="navbar">
      <span className="nav-logo" onClick={() => navigate('/')}>🍽 Hungry Queues</span>
      <div className="nav-links">
        {isStaff ? (
          <>
            <button className={`nav-btn ${location.pathname === '/staff/queue' ? 'active' : ''}`} onClick={() => navigate('/staff/queue')}>Live Queue</button>
            <button className={`nav-btn ${location.pathname === '/staff/stats' ? 'active' : ''}`} onClick={() => navigate('/staff/stats')}>Stats</button>
          </>
        ) : (
          <>
            <button className={`nav-btn ${location.pathname === '/order' ? 'active' : ''}`} onClick={() => navigate('/order')}>Place Order</button>
            <button className={`nav-btn ${location.pathname === '/token' ? 'active' : ''}`} onClick={() => navigate('/token')}>My Token</button>
          </>
        )}
      </div>
    </nav>
  )
}
