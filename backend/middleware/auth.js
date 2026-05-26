const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_TOKEN_SECRET || 'event-management-dev-secret';

function authenticateToken(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.auth = {
            userId: payload.userId,
            role: payload.role,
            username: payload.username,
        };
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = {
    authenticateToken,
    JWT_SECRET,
};