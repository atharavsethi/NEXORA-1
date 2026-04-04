const jwt = require('jsonwebtoken');
const { Users } = require('../db/store');

// Verify JWT and attach user to request.
// This middleware is resilient to in-memory store resets (server restarts).
// It reconstructs the user from the JWT payload when the store is empty.
const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'swasth_secret_2024');

    // Primary: look up from in-memory store
    let user = Users.findById(decoded.id);

    // Fallback A: newer tokens have name/email/role embedded in payload
    if (!user && decoded.name) {
      user = {
        _id: decoded.id,
        name: decoded.name,
        email: decoded.email || '',
        role: decoded.role || 'user',
        verified: decoded.verified !== undefined ? decoded.verified : true,
      };
    }

    // Fallback B: old tokens only had { id } — reconstruct from X-User-* headers
    // that the frontend can send alongside the token
    if (!user) {
      const headerName  = req.headers['x-user-name'];
      const headerEmail = req.headers['x-user-email'];
      const headerRole  = req.headers['x-user-role'];
      if (headerName) {
        user = {
          _id: decoded.id,
          name: headerName,
          email: headerEmail || '',
          role: headerRole || 'user',
          verified: true,
        };
      }
    }

    // Fallback C: absolute last resort — ghost user with just the ID
    // This allows the token to still work for non-name-sensitive operations
    if (!user) {
      user = {
        _id: decoded.id,
        name: 'User',
        email: '',
        role: decoded.role || 'user',
        verified: decoded.verified !== undefined ? decoded.verified : true,
      };
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

// Check role
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: `Role '${req.user.role}' is not authorized` });
  next();
};

// Check verified
const requireVerified = (req, res, next) => {
  if (!req.user.verified)
    return res.status(403).json({ message: 'Your account is pending verification by admin.' });
  next();
};

module.exports = { protect, requireRole, requireVerified };
