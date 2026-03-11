const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all events
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events ORDER BY event_date DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET single event by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE event
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { event_name, event_type, event_date, start_time, end_time, guest_count, location, status, notes } = req.body;
        
        const result = await pool.query(
            `UPDATE events 
             SET event_name = $1, event_type = $2, event_date = $3, start_time = $4, 
                 end_time = $5, guest_count = $6, location = $7, status = $8, notes = $9
             WHERE id = $10 RETURNING *`,
            [event_name, event_type, event_date, start_time, end_time, guest_count, location, status, notes, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE event
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE new event
router.post('/', async (req, res) => {
    try {
        const { event_name, event_type, event_date, start_time, end_time, guest_count, location, notes, caterers_needed, bartenders_needed } = req.body;
        
        const result = await pool.query(
            `INSERT INTO events (event_name, event_type, event_date, start_time, end_time, guest_count, location, notes, caterers_needed, bartenders_needed) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [event_name, event_type, event_date, start_time, end_time, guest_count, location, notes, caterers_needed, bartenders_needed]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;