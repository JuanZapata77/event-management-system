const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET single user by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE new user
router.post('/', async (req, res) => {
    try {
        const { name, email, password_hash, role, phone, hourly_rate } = req.body;
        
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, phone, hourly_rate) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, email, password_hash, role, phone, hourly_rate]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, phone, hourly_rate } = req.body;
        
        const result = await pool.query(
            `UPDATE users 
             SET name = $1, email = $2, role = $3, phone = $4, hourly_rate = $5
             WHERE id = $6 RETURNING *`,
            [name, email, role, phone, hourly_rate, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE worker availability
router.put('/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            is_available_for_shifts,
            unavailable_from,
            unavailable_to,
        } = req.body;

        const result = await pool.query(
            `UPDATE users
             SET is_available_for_shifts = COALESCE($1, is_available_for_shifts),
                 unavailable_from = $2,
                 unavailable_to = $3
             WHERE id = $4
             RETURNING *`,
            [is_available_for_shifts, unavailable_from, unavailable_to, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;