const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const safeUserColumns = `
    id,
    name,
    email,
    username,
    login_password_plain,
    role,
    phone,
    hourly_rate,
    is_available_for_shifts,
    unavailable_from,
    unavailable_to,
    created_at
`;

function mapUniqueConstraintError(error) {
    if (error?.code !== '23505') {
        return null;
    }

    const details = String(error.detail || '').toLowerCase();
    if (details.includes('username')) {
        return 'Username already exists';
    }

    if (details.includes('email')) {
        return 'Email already exists';
    }

    return 'Unique value already exists';
}

// GET all users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`SELECT ${safeUserColumns} FROM users ORDER BY created_at DESC`);
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
        const result = await pool.query(`SELECT ${safeUserColumns} FROM users WHERE id = $1`, [id]);
        
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
        const { name, email, username, password, role, phone, hourly_rate } = req.body;

        if (!name || !username || !role) {
            return res.status(400).json({ error: 'name, username, and role are required' });
        }

        const normalizedUsername = String(username).trim().toLowerCase();
        const resolvedPassword = password
            ? String(password)
            : `${normalizedUsername}@123`;
        const resolvedEmail = email
            ? String(email).trim().toLowerCase()
            : `${normalizedUsername}@workers.local`;
        const passwordHash = await bcrypt.hash(resolvedPassword, 10);
        
        const result = await pool.query(
            `INSERT INTO users (name, email, username, password_hash, login_password_plain, role, phone, hourly_rate) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING ${safeUserColumns}`,
            [name, resolvedEmail, normalizedUsername, passwordHash, resolvedPassword, role, phone, hourly_rate]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        const uniqueError = mapUniqueConstraintError(error);
        if (uniqueError) {
            return res.status(409).json({ error: uniqueError });
        }

        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, username, role, phone, hourly_rate } = req.body;

        const normalizedUsername = username ? String(username).trim().toLowerCase() : null;
        
        const result = await pool.query(
            `UPDATE users 
             SET name = $1, email = $2, username = $3, role = $4, phone = $5, hourly_rate = $6
             WHERE id = $7
             RETURNING ${safeUserColumns}`,
            [name, email, normalizedUsername, role, phone, hourly_rate, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        const uniqueError = mapUniqueConstraintError(error);
        if (uniqueError) {
            return res.status(409).json({ error: uniqueError });
        }

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
             RETURNING ${safeUserColumns}`,
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