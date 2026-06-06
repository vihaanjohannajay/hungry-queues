import { api } from '../api.js'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './CustomerToken.css'

export default function CustomerToken() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!state?.order_id) return
    fetch(api(`/api/orders/${state.order_id}/items`)).then(r => r.json()).then(setItems)
  }, [state])

  if (!state?.token_no) {
    return (
      <div className="page fade-up" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ color: 'var(--muted)' }}>No active order found.</p>
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/order')}>Place an Order</button>
      </div>
    )
  }

  const total = items.reduce((s, i) => s + parseFloat(i.subtotal), 0)

  return (
    <div className="page fade-up token-page">
      <div className="token-card">
        <div className="token-stall">{state.stall}</div>
        <p className="token-label">Your Token Number</p>
        <div className="token-number">{state.token_no}</div>
        <p className="token-sub">Show this to collect your order</p>
      </div>

      {items.length > 0 && (
        <div className="card order-summary">
          <p className="section-label" style={{ marginBottom: 14 }}>Order Summary</p>
          <div className="summary-list">
            {items.map(item => (
              <div key={item.order_item_id} className="summary-row">
                <span>{item.item_name} × {item.quantity}</span>
                <span>₹{parseFloat(item.subtotal).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <hr className="divider" />
          <div className="summary-row total-row">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      )}

      <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => navigate('/order')}>
        Place Another Order
      </button>
    </div>
  )
}
