import jwt from 'jsonwebtoken';

const secret = process.env.PORTAL_JWT_SECRET;
if (!secret) {
    throw new Error('PORTAL_JWT_SECRET must be set — no insecure fallback');
}

// automation-portal issues the token at login; this service only validates signature +
// expiry with the same shared secret, same as api-testing's/performance-testing's
// JwtValidationFilter — there's no local user store here to look anything else up against.
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid authentication token' });
    }
    try {
        jwt.verify(header.substring(7), secret);
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Missing or invalid authentication token' });
    }
}
