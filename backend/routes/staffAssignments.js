const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all staff assignments
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT sa.*, u.name as worker_name, u.hourly_rate, e.event_name, e.event_date 
             FROM staff_assignments sa
             JOIN users u ON sa.user_id = u.id
             JOIN events e ON sa.event_id = e.id
             ORDER BY e.event_date DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET assignments for a specific event
router.get('/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const result = await pool.query(
            `SELECT sa.*, u.name as worker_name, u.phone, u.hourly_rate
             FROM staff_assignments sa
             JOIN users u ON sa.user_id = u.id
             WHERE sa.event_id = $1`,
            [eventId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET assignments for a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            `SELECT sa.*, e.event_name, e.event_date, e.start_time, e.end_time, e.location
             FROM staff_assignments sa
             JOIN events e ON sa.event_id = e.id
             WHERE sa.user_id = $1
             ORDER BY e.event_date DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE new staff assignment
router.post('/', async (req, res) => {
    try {
        const { event_id, user_id, role_for_event, confirmation_status } = req.body;
        
        const result = await pool.query(
            `INSERT INTO staff_assignments (event_id, user_id, role_for_event, confirmation_status) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [event_id, user_id, role_for_event, confirmation_status || 'pending']
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE staff assignment (for confirmations and hours worked)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { confirmation_status, hours_worked, role_for_event } = req.body;
        
        const result = await pool.query(
            `UPDATE staff_assignments 
             SET confirmation_status = $1, hours_worked = $2, role_for_event = $3
             WHERE id = $4 RETURNING *`,
            [confirmation_status, hours_worked, role_for_event, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE staff assignment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM staff_assignments WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;