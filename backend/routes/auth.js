const express = require('express');
const bcrypt = require('bcryptjs');
const { generateSecret, generateURI, verify } = require('otplib');
const QRCode = require('qrcode');
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
    mfa_enabled,
    created_at
`;

function isLegacyPlainPassword(storedHash) {
    return !storedHash || (!storedHash.startsWith('$2a$') && !storedHash.startsWith('$2b$') && !storedHash.startsWith('$2y$'));
}

router.post('/login', async (req, res) => {
    try {
        const { username, password, otpCode } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'username and password are required' });
        }

        const normalizedUsername = String(username).trim().toLowerCase();
        const result = await pool.query(
            `SELECT id, username, password_hash, role, mfa_enabled, mfa_secret FROM users WHERE lower(username) = $1 LIMIT 1`,
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

        const requiresMfa = account.role === 'manager' && account.mfa_enabled && account.mfa_secret;
        if (requiresMfa) {
            const providedOtp = String(otpCode || '').trim();

            if (!providedOtp) {
                return res.status(401).json({ error: 'Two-factor code is required for manager login' });
            }

            const otpValid = verify({
                secret: account.mfa_secret,
                token: providedOtp,
            });

            if (!otpValid) {
                return res.status(401).json({ error: 'Invalid two-factor code' });
            }
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

router.post('/manager-2fa/setup', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ error: 'userId and password are required' });
        }

        const result = await pool.query(
            `SELECT id, name, email, username, password_hash, role FROM users WHERE id = $1 LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        if (user.role !== 'manager') {
            return res.status(403).json({ error: 'Only manager accounts can enable 2FA' });
        }

        const passwordValid = await bcrypt.compare(String(password), user.password_hash);
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const secret = generateSecret();
        const issuer = 'EventPro Manager';
        const label = user.email || user.username || 'manager';
        const otpauthUrl = generateURI({
            secret,
            issuer,
            label,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        await pool.query(
            `UPDATE users
             SET mfa_secret = $1,
                 mfa_enabled = TRUE
             WHERE id = $2`,
            [secret, user.id]
        );

        return res.json({
            message: 'Two-factor authentication enabled',
            secret,
            otpauthUrl,
            qrCodeDataUrl,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
