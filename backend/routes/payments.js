const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all payments
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, u.name as worker_name, e.event_name, e.event_date 
             FROM payments p
             JOIN users u ON p.user_id = u.id
             JOIN events e ON p.event_id = e.id
             ORDER BY p.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET payments for a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            `SELECT p.*, e.event_name, e.event_date 
             FROM payments p
             JOIN events e ON p.event_id = e.id
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET payments for a specific event
router.get('/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const result = await pool.query(
            `SELECT p.*, u.name as worker_name 
             FROM payments p
             JOIN users u ON p.user_id = u.id
             WHERE p.event_id = $1`,
            [eventId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE new payment
router.post('/', async (req, res) => {
    try {
        const { user_id, event_id, amount, payment_date, status, notes } = req.body;
        
        const result = await pool.query(
            `INSERT INTO payments (user_id, event_id, amount, payment_date, status, notes) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [user_id, event_id, amount, payment_date, status || 'pending', notes]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE payment
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_date, status, notes } = req.body;
        
        const result = await pool.query(
            `UPDATE payments 
             SET amount = $1, payment_date = $2, status = $3, notes = $4
             WHERE id = $5 RETURNING *`,
            [amount, payment_date, status, notes, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE payment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM payments WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;