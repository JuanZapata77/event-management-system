const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all events
router.get('/', async (req, res) => {
    try {
        const { status, type, search, fromDate, toDate } = req.query;
        const whereClauses = [];
        const values = [];

        if (status && status !== 'all') {
            values.push(status);
            whereClauses.push(`status = $${values.length}`);
        }

        if (type && type !== 'all') {
            values.push(type);
            whereClauses.push(`event_type = $${values.length}`);
        }

        if (search) {
            values.push(`%${search}%`);
            whereClauses.push(`(event_name ILIKE $${values.length} OR location ILIKE $${values.length} OR event_type ILIKE $${values.length})`);
        }

        if (fromDate) {
            values.push(fromDate);
            whereClauses.push(`event_date >= $${values.length}`);
        }

        if (toDate) {
            values.push(toDate);
            whereClauses.push(`event_date <= $${values.length}`);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const query = `SELECT * FROM events ${whereSql} ORDER BY event_date DESC, start_time DESC`;

        const result = await pool.query(query, values);
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
        const {
            event_name,
            event_type,
            event_date,
            start_time,
            end_time,
            guest_count,
            location,
            status,
            notes,
            caterers_needed,
            bartenders_needed,
        } = req.body;
        
        const result = await pool.query(
            `UPDATE events 
             SET event_name = $1, event_type = $2, event_date = $3, start_time = $4, 
                 end_time = $5, guest_count = $6, location = $7, status = $8, notes = $9,
                 caterers_needed = $10, bartenders_needed = $11
             WHERE id = $12 RETURNING *`,
            [
                event_name,
                event_type,
                event_date,
                start_time,
                end_time,
                guest_count,
                location,
                status,
                notes,
                caterers_needed,
                bartenders_needed,
                id,
            ]
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