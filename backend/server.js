const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const app = express();
const eventsRouter = require('./routes/events');
const usersRouter = require('./routes/users');

const staffAssignmentsRouter = require('./routes/staffAssignments');
const eventInventoryRouter = require('./routes/eventInventory');
const paymentsRouter = require('./routes/payments');
const inventoryItemsRouter = require('./routes/inventoryItems');

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

app.use('/api/events', eventsRouter);
app.use('/api/users', usersRouter);
app.use('/api/inventory-items', inventoryItemsRouter);
app.use('/api/staff-assignments', staffAssignmentsRouter);
app.use('/api/event-inventory', eventInventoryRouter);
app.use('/api/payments', paymentsRouter);


const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});