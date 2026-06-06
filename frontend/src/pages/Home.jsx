import { api } from '../api.js'
import { useNavigate } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="home">
      <div className="home-bg" />
      <div className="home-content fade-up">
        <div className="home-logo">🍽</div>
        <h1 className="home-title">Hungry Queues</h1>
        <p className="home-sub">Food court queue management system</p>
        <div className="home-cards">
          <div className="role-card customer" onClick={() => navigate('/order')}>
            <div className="role-icon">🧑‍💼</div>
            <h2>Customer</h2>
            <p>Browse stalls, place orders, and track your token</p>
            <span className="role-cta">Order Now →</span>
          </div>
          <div className="role-card staff" onClick={() => navigate('/staff/queue')}>
            <div className="role-icon">👨‍🍳</div>
            <h2>Staff</h2>
            <p>Manage the live queue, serve orders, view daily stats</p>
            <span className="role-cta">Open Dashboard →</span>
          </div>
        </div>
      </div>
    </div>
  )
}
