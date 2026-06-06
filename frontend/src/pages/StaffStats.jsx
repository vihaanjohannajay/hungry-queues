import { api } from '../api.js'
import { useState, useEffect } from 'react'
import './StaffStats.css'

export default function StaffStats() {
  const [revenue, setRevenue] = useState([])
  const [stats, setStats]     = useState([])
  const [tab, setTab]         = useState('revenue')

  useEffect(() => {
    fetch(api('/api/stats/revenue')).then(r => r.json()).then(setRevenue)
    fetch(api('/api/stats')).then(r => r.json()).then(setStats)
  }, [])

  const maxRevenue = Math.max(...revenue.map(r => parseFloat(r.total_revenue) || 0), 1)

  const statsByDate = stats.reduce((acc, s) => {
    const d = s.stat_date?.split('T')[0] || s.stat_date
    if (!acc[d]) acc[d] = []
    acc[d].push(s)
    return acc
  }, {})

  return (
    <div className="page fade-up">
      <h1 className="page-title">Stats & Reports</h1>
      <p className="page-sub">Revenue breakdown and daily order counts</p>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'revenue' ? 'active' : ''}`} onClick={() => setTab('revenue')}>Revenue</button>
        <button className={`tab-btn ${tab === 'daily'   ? 'active' : ''}`} onClick={() => setTab('daily')}>Daily Orders</button>
      </div>

      {tab === 'revenue' && (
        <div className="revenue-section fade-up">
          <div className="revenue-list">
            {revenue.map((r, i) => (
              <div key={r.stall_name} className="revenue-row card">
                <div className="rev-rank">#{i + 1}</div>
                <div className="rev-info">
                  <div className="rev-name">{r.stall_name}</div>
                  <div className="rev-bar-wrap">
                    <div className="rev-bar" style={{ width: `${(parseFloat(r.total_revenue) / maxRevenue) * 100}%` }} />
                  </div>
                  <div className="rev-meta">{r.total_orders} orders</div>
                </div>
                <div className="rev-amount">₹{parseFloat(r.total_revenue).toFixed(0)}</div>
              </div>
            ))}
          </div>
          <div className="rev-total card">
            <span style={{ color: 'var(--muted)' }}>Total Revenue (all stalls)</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>
              ₹{revenue.reduce((s, r) => s + parseFloat(r.total_revenue), 0).toFixed(0)}
            </span>
          </div>
        </div>
      )}

      {tab === 'daily' && (
        <div className="daily-section fade-up">
          {Object.entries(statsByDate).map(([date, rows]) => (
            <div key={date} className="daily-group">
              <p className="section-label" style={{ marginBottom: 10 }}>{date}</p>
              <div className="daily-grid">
                {rows.map(s => (
                  <div key={s.stall_id} className="daily-card card">
                    <div className="daily-stall">{s.stall_name}</div>
                    <div className="daily-count">{s.total_orders}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>orders</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
