# 🍽 Hungry Queues – Setup Guide

## Prerequisites
- Node.js installed (https://nodejs.org) – any version 16+
- MySQL 5.5 running with the foodcourt database set up

---

## Step 1 – Configure your MySQL password

Open `backend/server.js` and update line 10:

```js
password: '',   // ← put your MySQL root password here
```

---

## Step 2 – Start the Backend

Open a terminal in the `hungry-queues/backend/` folder:

```bash
npm install
node server.js
```

You should see:
```
✅ Connected to MySQL – foodcourt database
🚀 Hungry Queues API running at http://localhost:3001
```

Leave this terminal open.

---

## Step 3 – Start the Frontend

Open a **second terminal** in the `hungry-queues/frontend/` folder:

```bash
npm install
npm run dev
```

You should see:
```
  VITE v5.x  ready in xxx ms
  ➜  Local: http://localhost:5173/
```

---

## Step 4 – Open the App

Go to: **http://localhost:5173**

---

## App Pages

| Route | Description |
|---|---|
| `/` | Home – choose Customer or Staff |
| `/order` | Customer – browse stalls, add items, place order |
| `/token` | Customer – view token number after ordering |
| `/staff/queue` | Staff – live queue, expand orders, mark as served |
| `/staff/stats` | Staff – revenue per stall + daily order counts |

---

## Troubleshooting

**"MySQL connection failed"**
- Make sure MySQL is running
- Check username/password in `backend/server.js`
- Make sure the `foodcourt` database exists (`source C:/sql/hungry_queues_extended_data.sql`)

**"Failed to place order"**
- Backend is not running – start it first with `node server.js`

**Port already in use**
- Backend uses port 3001, frontend uses 5173
- Kill any process using those ports and restart
