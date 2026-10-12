const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateSecret, generateURI, verify } = require('otplib');
const QRCode = require('qrcode');
const pool = require('../config/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

let usersColumnInfoPromise = null;

async function getUsersColumnInfo() {
    if (!usersColumnInfoPromise) {
        usersColumnInfoPromise = pool
            .query(
                `SELECT column_name
                 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name = 'users'`
            )
            .then((result) => {
                const columns = new Set(result.rows.map((row) => row.column_name));

                return {
                    hasMfaEnabled: columns.has('mfa_enabled'),
                    hasMfaSecret: columns.has('mfa_secret'),
                    hasAvailability: columns.has('is_available_for_shifts'),
                    hasUnavailableFrom: columns.has('unavailable_from'),
                    hasUnavailableTo: columns.has('unavailable_to'),
                    hasPhone: columns.has('phone'),
                    hasHourlyRate: columns.has('hourly_rate'),
                    hasUsername: columns.has('username'),
                };
            })
            .catch((error) => {
                usersColumnInfoPromise = null;
                throw error;
            });
    }

    return usersColumnInfoPromise;
}

async function ensureMfaColumns() {
    const { hasMfaEnabled, hasMfaSecret } = await getUsersColumnInfo();

    if (hasMfaEnabled && hasMfaSecret) {
        return { hasMfaEnabled, hasMfaSecret };
    }

    await pool.query(
        `ALTER TABLE users
         ADD COLUMN IF NOT EXISTS mfa_secret TEXT`
    );

    await pool.query(
        `ALTER TABLE users
         ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE`
    );

    usersColumnInfoPromise = null;
    return getUsersColumnInfo();
}

function buildUserSelectColumns({ hasMfaEnabled, hasAvailability, hasUnavailableFrom, hasUnavailableTo, hasPhone, hasHourlyRate }) {
    const columns = [
        'id',
        'name',
        'email',
        'username',
        'role',
    ];

    if (hasPhone !== false) columns.push('phone');
    if (hasHourlyRate !== false) columns.push('hourly_rate');
    if (hasAvailability !== false) columns.push('is_available_for_shifts');
    if (hasUnavailableFrom !== false) columns.push('unavailable_from');
    if (hasUnavailableTo !== false) columns.push('unavailable_to');
    if (hasMfaEnabled) columns.push('mfa_enabled');

    columns.push('created_at');
    return columns.join(',\n    ');
}

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
        const columnInfo = await getUsersColumnInfo();
        const { hasMfaEnabled, hasMfaSecret } = columnInfo;

        const loginColumns = [
            'id',
            'username',
            'password_hash',
            'role',
        ];

        if (hasMfaEnabled) {
            loginColumns.push('mfa_enabled');
        }

        if (hasMfaSecret) {
            loginColumns.push('mfa_secret');
        }

        const result = await pool.query(
            `SELECT ${loginColumns.join(', ')} FROM users WHERE lower(username) = $1 LIMIT 1`,
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

            let otpValid = false;
            try {
                const verificationResult = await verify({
                    secret: account.mfa_secret,
                    token: providedOtp,
                });
                otpValid = Boolean(verificationResult?.valid);
            } catch (otpErr) {
                // Catches TokenLengthError or invalid format from otplib
                otpValid = false;
            }

            if (!otpValid) {
                return res.status(401).json({ error: 'Invalid two-factor code' });
            }
        }

        const safeUserResult = await pool.query(
            `SELECT ${buildUserSelectColumns(columnInfo)} FROM users WHERE id = $1`,
            [account.id]
        );

        const safeUser = safeUserResult.rows[0];
        const token = jwt.sign(
            {
                userId: safeUser.id,
                role: safeUser.role,
                username: safeUser.username,
            },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        return res.json({ user: safeUser, token });
    } catch (error) {
        console.error('Login error:', error);
        const errorMessage = error?.message || 'Server error';
        if (
            error.code === 'ECONNREFUSED' ||
            errorMessage.includes('certificate') ||
            error.code === '28P01' ||
            error.code === 'ENOTFOUND'
        ) {
            return res.status(500).json({
                error: `Database connection error: ${errorMessage}. Please check backend DB environment variables and SSL settings.`
            });
        }
        return res.status(500).json({ error: `Server error: ${errorMessage}` });
    }
});

router.post('/manager-2fa/setup', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.auth?.userId;

        if (!userId || !password) {
            return res.status(400).json({ error: 'password is required' });
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

        const { hasMfaEnabled, hasMfaSecret } = await ensureMfaColumns();

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
