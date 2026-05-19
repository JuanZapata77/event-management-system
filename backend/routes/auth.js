const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const router = express.Router();

const safeUserColumns = `
    id,
    name,
    email,
    username,
    role,
    phone,
    hourly_rate,
    is_available_for_shifts,
    unavailable_from,
    unavailable_to,
    created_at
`;

function isLegacyPlainPassword(storedHash) {
    return !storedHash || (!storedHash.startsWith('$2a$') && !storedHash.startsWith('$2b$') && !storedHash.startsWith('$2y$'));
}

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'username and password are required' });
        }

        const normalizedUsername = String(username).trim().toLowerCase();
        const result = await pool.query(
            `SELECT id, username, password_hash FROM users WHERE lower(username) = $1 LIMIT 1`,
            [normalizedUsername]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const account = result.rows[0];
        const providedPassword = String(password);

        let passwordValid = false;

        if (isLegacyPlainPassword(account.password_hash)) {
            passwordValid = account.password_hash === providedPassword;

            if (passwordValid) {
                const newHash = await bcrypt.hash(providedPassword, 10);
                await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, account.id]);
            }
        } else {
            passwordValid = await bcrypt.compare(providedPassword, account.password_hash);
        }

        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const safeUserResult = await pool.query(
            `SELECT ${safeUserColumns} FROM users WHERE id = $1`,
            [account.id]
        );

        return res.json({ user: safeUserResult.rows[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
