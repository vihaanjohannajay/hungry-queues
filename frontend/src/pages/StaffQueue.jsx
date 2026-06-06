import { api } from '../api.js'
import { useState, useEffect, useRef, useCallback } from 'react'
import './StaffQueue.css'

const POLL_INTERVAL = 3000 // poll every 3 seconds

export default function StaffQueue() {
  const [queue, setQueue]             = useState([])
  const [expanded, setExpanded]       = useState(null)
  const [orderItems, setOrderItems]   = useState({})
  const [serving, setServing]         = useState(null)
  const [newOrderIds, setNewOrderIds] = useState(new Set())
  const [liveStatus, setLiveStatus]   = useState('connecting')
  const [lastRefresh, setLastRefresh] = useState(null)

  const latestIdRef   = useRef(null)
  const countRef      = useRef(null)
  const pollingActive = useRef(true)

  const fetchQueue = useCallback(async () => {
    try {
      const data = await fetch(api('/api/orders/queue')).then(r => r.json())
      setQueue(data)
      setLastRefresh(new Date())
      setLiveStatus('live')
      if (data.length > 0) {
        latestIdRef.current = Math.max(...data.map(o => o.order_id))
        countRef.current    = data.length
      } else {
        countRef.current = 0
      }
    } catch {
      setLiveStatus('error')
    }
  }, [])

  useEffect(() => {
    pollingActive.current = true

    const poll = async () => {
      while (pollingActive.current) {
        await new Promise(res => setTimeout(res, POLL_INTERVAL))
        if (!pollingActive.current) break

        try {
          const snapshot = await fetch(api('/api/orders/queue/poll')).then(r => r.json())
          const changed  =
            snapshot.count     !== countRef.current ||
            snapshot.latest_id !== latestIdRef.current

          if (changed) {
            const isNewOrder =
              snapshot.latest_id &&
              latestIdRef.current &&
              snapshot.latest_id > latestIdRef.current

            await fetchQueue()

            if (isNewOrder) {
              setNewOrderIds(prev => new Set([...prev, snapshot.latest_id]))
              setTimeout(() => {
                setNewOrderIds(prev => {
                  const next = new Set(prev)
                  next.delete(snapshot.latest_id)
                  return next
                })
              }, 4000)
            }
          }
          setLiveStatus('live')
        } catch {
          setLiveStatus('error')
        }
      }
    }

    fetchQueue().then(poll)
    return () => { pollingActive.current = false }
  }, [fetchQueue])

  const toggleExpand = async (order_id) => {
    if (expanded === order_id) { setExpanded(null); return }
    setExpanded(order_id)
    if (!orderItems[order_id]) {
      const data = await fetch(api(`/api/orders/${order_id}/items`)).then(r => r.json())
      setOrderItems(prev => ({ ...prev, [order_id]: data }))
    }
  }

  const serveOrder = async (order_id) => {
    setServing(order_id)
    try {
      await fetch(api(`/api/orders/${order_id}/serve`), { method: 'PATCH' })
      setQueue(prev => prev.filter(o => o.order_id !== order_id))
      if (expanded === order_id) setExpanded(null)
      countRef.current = Math.max(0, (countRef.current || 1) - 1)
    } catch {
      alert('Failed to serve order. Check backend connection.')
    } finally {
      setServing(null)
    }
  }

  const formatTime = (dt) =>
    new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const waitMinutes = (dt) =>
    Math.floor((Date.now() - new Date(dt)) / 60000)

  return (
    <div className="page fade-up">
      <div className="queue-header">
        <div>
          <h1 className="page-title">Live Queue</h1>
          <p className="page-sub">
            {queue.length} order{queue.length !== 1 ? 's' : ''} pending
            {lastRefresh && ` · updated ${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`live-badge ${liveStatus}`}>
            <span className="live-dot" />
            {liveStatus === 'live'   ? 'Live'
            : liveStatus === 'error' ? 'Disconnected'
            :                          'Connecting…'}
          </div>
          <button className="btn-ghost" onClick={fetchQueue}>↻</button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="empty-queue card">
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 6 }}>Queue is clear!</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>No pending orders right now.</p>
        </div>
      ) : (
        <div className="queue-list">
          {queue.map(order => {
            const wait   = waitMinutes(order.order_time)
            const isLate = wait > 15
            const isNew  = newOrderIds.has(order.order_id)
            return (
              <div key={order.order_id}
                className={`queue-card card ${expanded === order.order_id ? 'expanded' : ''} ${isLate ? 'late' : ''} ${isNew ? 'new-order' : ''}`}>
                {isNew && <div className="new-order-banner">🔔 New Order</div>}
                <div className="queue-row" onClick={() => toggleExpand(order.order_id)}>
                  <div className="queue-token">#{order.token_no}</div>
                  <div className="queue-info">
                    <div className="queue-stall">{order.stall_name}</div>
                    <div className="queue-time">
                      Ordered at {formatTime(order.order_time)}
                      <span className={`wait-badge ${isLate ? 'late' : ''}`}>
                        {wait === 0 ? 'just now' : `${wait}m ago`}
                      </span>
                    </div>
                  </div>
                  <div className="queue-actions">
                    <button className="btn-green"
                      onClick={(e) => { e.stopPropagation(); serveOrder(order.order_id) }}
                      disabled={serving === order.order_id}>
                      {serving === order.order_id ? '…' : '✓ Serve'}
                    </button>
                    <span className="expand-icon">{expanded === order.order_id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded === order.order_id && (
                  <div className="order-details fade-up">
                    <hr className="divider" />
                    {orderItems[order.order_id] ? (
                      <>
                        {orderItems[order.order_id].map(item => (
                          <div key={item.order_item_id} className="detail-row">
                            <span>{item.item_name} × {item.quantity}</span>
                            <span style={{ color: 'var(--muted)' }}>₹{parseFloat(item.subtotal).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="detail-row total-row">
                          <span>Total</span>
                          <span>₹{orderItems[order.order_id].reduce((s, i) => s + parseFloat(i.subtotal), 0).toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading items…</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}