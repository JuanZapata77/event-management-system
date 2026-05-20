const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET notifications for a user
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        const result = await pool.query(
            `SELECT n.id, n.event_id, n.message, n.is_read, n.created_at, e.event_name, e.event_date
             FROM notifications n
             LEFT JOIN events e ON e.id = n.event_id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark a notification as read
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
