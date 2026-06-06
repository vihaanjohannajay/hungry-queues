const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'https://hungry-queues.vercel.app']
}));
app.use(express.json());

// ── DB CONNECTION ─────────────────────────────────────────
const db = mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'foodcourt'
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL – foodcourt database');
});

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) =>
      err ? reject(err) : resolve(results)
    )
  );

// ── STALLS ────────────────────────────────────────────────
app.get('/api/stalls', async (req, res) => {
  try {
    const stalls = await query('SELECT * FROM STALL ORDER BY stall_id');
    res.json(stalls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MENU ──────────────────────────────────────────────────
app.get('/api/menu/:stall_id', async (req, res) => {
  try {
    const items = await query(
      'SELECT * FROM MENU_ITEM WHERE stall_id = ? ORDER BY item_id',
      [req.params.stall_id]
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/menu', async (req, res) => {
  try {
    const items = await query(
      `SELECT M.*, S.stall_name FROM MENU_ITEM M
       JOIN STALL S ON M.stall_id = S.stall_id
       ORDER BY M.stall_id, M.item_id`
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ORDERS ────────────────────────────────────────────────
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await query(
      `SELECT O.order_id, O.token_no, O.order_time, O.served_time,
              O.status, O.stall_id, S.stall_name
       FROM ORDERS O
       JOIN STALL S ON O.stall_id = S.stall_id
       ORDER BY O.order_time DESC`
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lightweight poll endpoint – returns count + latest order_id for change detection
app.get('/api/orders/queue/poll', async (req, res) => {
  try {
    const [row] = await query(
      `SELECT COUNT(*) AS count, MAX(order_id) AS latest_id
       FROM ORDERS WHERE status = 'PLACED'`
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full queue – only PLACED orders
app.get('/api/orders/queue', async (req, res) => {
  try {
    const orders = await query(
      `SELECT O.order_id, O.token_no, O.order_time,
              O.status, O.stall_id, S.stall_name
       FROM ORDERS O
       JOIN STALL S ON O.stall_id = S.stall_id
       WHERE O.status = 'PLACED'
       ORDER BY O.order_time ASC`
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Items for a specific order
app.get('/api/orders/:order_id/items', async (req, res) => {
  try {
    const items = await query(
      `SELECT OI.order_item_id, OI.quantity,
              M.item_name, M.price,
              (M.price * OI.quantity) AS subtotal
       FROM ORDER_ITEM OI
       JOIN MENU_ITEM M ON OI.item_id = M.item_id
       WHERE OI.order_id = ?`,
      [req.params.order_id]
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Place a new order
app.post('/api/orders', async (req, res) => {
  const { stall_id, items } = req.body;
  if (!stall_id || !items || items.length === 0)
    return res.status(400).json({ error: 'stall_id and items are required' });

  try {
    const [maxOrder] = await query('SELECT MAX(order_id) AS max_id FROM ORDERS');
    const order_id = (maxOrder.max_id || 0) + 1;

    // Token number: continue from today's max, or start at a random offset
    // so the first order of each day isn't always token #1
    const [maxToken] = await query(
      'SELECT MAX(token_no) AS max_token FROM ORDERS WHERE stall_id = ? AND DATE(order_time) = CURDATE()',
      [stall_id]
    );
    const token_no = maxToken.max_token
      ? maxToken.max_token + 1
      : Math.floor(Math.random() * 30) + 10; // first order of day: start between 10–39

    await query(
      `INSERT INTO ORDERS (order_id, token_no, order_time, status, stall_id)
       VALUES (?, ?, NOW(), 'PLACED', ?)`,
      [order_id, token_no, stall_id]
    );

    const [maxItem] = await query('SELECT MAX(order_item_id) AS max_id FROM ORDER_ITEM');
    let item_seq = (maxItem.max_id || 0) + 1;
    for (const item of items) {
      await query(
        'INSERT INTO ORDER_ITEM (order_item_id, quantity, order_id, item_id) VALUES (?, ?, ?, ?)',
        [item_seq++, item.quantity, order_id, item.item_id]
      );
    }

    res.json({ order_id, token_no, message: 'Order placed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark order as served
app.patch('/api/orders/:order_id/serve', async (req, res) => {
  try {
    await query(
      `UPDATE ORDERS SET status = 'SERVED', served_time = NOW() WHERE order_id = ?`,
      [req.params.order_id]
    );
    res.json({ message: 'Order marked as served' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DAILY STATS ───────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await query(
      `SELECT DS.stat_date, DS.total_orders, DS.stall_id, S.stall_name
       FROM DAILY_STATS DS
       JOIN STALL S ON DS.stall_id = S.stall_id
       ORDER BY DS.stat_date DESC, DS.stall_id`
    );
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/revenue', async (req, res) => {
  try {
    const revenue = await query(
      `SELECT S.stall_name,
              COUNT(DISTINCT O.order_id)    AS total_orders,
              SUM(M.price * OI.quantity)    AS total_revenue
       FROM ORDERS O
       JOIN ORDER_ITEM OI ON O.order_id = OI.order_id
       JOIN MENU_ITEM  M  ON OI.item_id = M.item_id
       JOIN STALL      S  ON O.stall_id = S.stall_id
       GROUP BY S.stall_id, S.stall_name
       ORDER BY total_revenue DESC`
    );
    res.json(revenue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── START ─────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Hungry Queues API running at http://localhost:${PORT}`);
});
