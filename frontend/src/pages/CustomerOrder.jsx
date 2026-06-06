import { api } from '../api.js'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './CustomerOrder.css'

export default function CustomerOrder() {
  const [stalls, setStalls]             = useState([])
  const [selectedStall, setSelectedStall] = useState(null)
  const [menu, setMenu]                 = useState([])
  const [cart, setCart]                 = useState({})
  const [loading, setLoading]           = useState(false)
  const [placing, setPlacing]           = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch(api('/api/stalls')).then(r => r.json()).then(setStalls)
  }, [])

  useEffect(() => {
    if (!selectedStall) return
    setLoading(true)
    setCart({})
    fetch(api(`/api/menu/${selectedStall.stall_id}`))
      .then(r => r.json())
      .then(data => { setMenu(data); setLoading(false) })
  }, [selectedStall])

  const updateCart = (item_id, delta) => {
    setCart(prev => {
      const qty = (prev[item_id] || 0) + delta
      if (qty <= 0) { const next = { ...prev }; delete next[item_id]; return next }
      return { ...prev, [item_id]: qty }
    })
  }

  const cartTotal = menu.reduce((sum, item) => sum + (cart[item.item_id] || 0) * parseFloat(item.price), 0)
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  const placeOrder = async () => {
    const items = Object.entries(cart).map(([item_id, quantity]) => ({ item_id: parseInt(item_id), quantity }))
    setPlacing(true)
    try {
      const res  = await fetch(api('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stall_id: selectedStall.stall_id, items })
      })
      const data = await res.json()
      if (data.token_no) {
        navigate('/token', { state: { token_no: data.token_no, order_id: data.order_id, stall: selectedStall.stall_name } })
      }
    } catch {
      alert('Failed to place order. Is the backend running?')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="page fade-up">
      <h1 className="page-title">Place an Order</h1>
      <p className="page-sub">Choose a stall and add items to your cart</p>

      <p className="section-label" style={{ marginBottom: 12 }}>Select a Stall</p>
      <div className="stall-grid">
        {stalls.map(s => (
          <div key={s.stall_id}
            className={`stall-chip ${selectedStall?.stall_id === s.stall_id ? 'active' : ''}`}
            onClick={() => setSelectedStall(s)}>
            <span className="stall-name">{s.stall_name}</span>
            <span className="stall-prep">~{s.avg_prep_time} min</span>
          </div>
        ))}
      </div>

      {selectedStall && (
        <div className="menu-section fade-up">
          <div className="menu-header">
            <div>
              <p className="section-label">Menu</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginTop: 4 }}>{selectedStall.stall_name}</h2>
            </div>
            {cartCount > 0 && (
              <div className="cart-pill">{cartCount} item{cartCount > 1 ? 's' : ''} · ₹{cartTotal.toFixed(2)}</div>
            )}
          </div>

          {loading ? (
            <p style={{ color: 'var(--muted)', padding: '24px 0' }}>Loading menu…</p>
          ) : (
            <div className="menu-list">
              {menu.map(item => (
                <div key={item.item_id} className="menu-item card">
                  <div className="menu-item-info">
                    <span className="menu-item-name">{item.item_name}</span>
                    <span className="menu-item-price">₹{parseFloat(item.price).toFixed(2)}</span>
                  </div>
                  <div className="qty-control">
                    {cart[item.item_id] ? (
                      <>
                        <button className="qty-btn" onClick={() => updateCart(item.item_id, -1)}>−</button>
                        <span className="qty-num">{cart[item.item_id]}</span>
                        <button className="qty-btn" onClick={() => updateCart(item.item_id, +1)}>+</button>
                      </>
                    ) : (
                      <button className="add-btn" onClick={() => updateCart(item.item_id, 1)}>Add</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {cartCount > 0 && (
            <div className="order-bar">
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{cartCount} item{cartCount > 1 ? 's' : ''}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>₹{cartTotal.toFixed(2)}</div>
              </div>
              <button className="btn-primary" onClick={placeOrder} disabled={placing}>
                {placing ? 'Placing…' : 'Place Order →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
