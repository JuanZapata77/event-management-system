const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET notifications for a user
router.get('/', async (req, res) => {
    try {
        const authenticatedUserId = Number(req.auth.userId);
        const requestedUserId = req.query.userId ? Number(req.query.userId) : authenticatedUserId;

        if (!Number.isInteger(authenticatedUserId)) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (requestedUserId !== authenticatedUserId) {
            return res.status(403).json({ error: 'You can only view your own notifications' });
        }

        const result = await pool.query(
            `SELECT n.id, n.event_id, n.message, n.is_read, n.created_at, e.event_name, e.event_date
             FROM notifications n
             LEFT JOIN events e ON e.id = n.event_id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC`,
            [authenticatedUserId]
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
        const result = await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.auth.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
