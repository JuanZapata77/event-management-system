const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const app = express();
const eventsRouter = require('./routes/events');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');

const staffAssignmentsRouter = require('./routes/staffAssignments');
const eventInventoryRouter = require('./routes/eventInventory');
const paymentsRouter = require('./routes/payments');
const inventoryItemsRouter = require('./routes/inventoryItems');
const notificationsRouter = require('./routes/notifications');


const { ensureDatabaseSchema } = require('./utils/initDb');

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '');
    const isAllowed =
      allowedOrigins.includes('*') ||
      allowedOrigins.some((allowed) => allowed === cleanOrigin || allowed === origin);

    if (isAllowed || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

// Health check route with database connectivity test
app.get('/api/health', async (req, res) => {
  try {
    const start = Date.now();
    const result = await pool.query('SELECT NOW()');
    const duration = Date.now() - start;
    res.json({
      status: 'ok',
      database: 'connected',
      latencyMs: duration,
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// Test route
app.get('/api/test', async (req, res) => {
  let dbStatus = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    dbStatus = 'disconnected: ' + err.message;
  }
  res.json({ message: 'Server is working!', database: dbStatus });
});

app.use('/api/events', eventsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/inventory-items', inventoryItemsRouter);
app.use('/api/staff-assignments', staffAssignmentsRouter);
app.use('/api/event-inventory', eventInventoryRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/notifications', notificationsRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Auto-verify and sync database schema and default accounts
    try {
      await ensureDatabaseSchema(pool);
    } catch (err) {
      console.error('Error ensuring database schema on startup:', err);
    }
});