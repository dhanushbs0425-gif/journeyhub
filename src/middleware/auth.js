const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'journeyhub_capstone_secure_secret_2026';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to req.user
 */
async function protect(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    let decoded = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      // Fallback verification for worker-issued tokens
      decoded = jwt.verify(token, 'journeyhub_super_secure_capstone_jwt_secret_key_2026');
    }
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.',
      error: error.message
    });
  }
}

/**
 * Generate JWT token for user
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

/**
 * Organiser role authorization guard
 * Blocks regular Users from trip creation/management (HTTP 403)
 */
function requireOrganiser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.'
    });
  }

  const role = (req.user.role || '').toLowerCase();
  if (role !== 'organiser' && role !== 'organizer' && role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only users with the Organiser role can create or manage trips.'
    });
  }

  next();
}

/**
 * Optional authentication middleware
 * Attaches user to req.user if valid token provided, but doesn't block if absent
 */
async function optionalAuth(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (token) {
      let decoded = null;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err1) {
        try {
          decoded = jwt.verify(token, 'journeyhub_super_secure_capstone_jwt_secret_key_2026');
        } catch (_) {}
      }
      if (decoded && decoded.id) {
        req.user = await User.findById(decoded.id);
      }
    }
  } catch (err) {
    // Gracefully ignore token errors for optional auth
  }
  next();
}

/**
 * Valid Organiser Invitation Passkeys
 */
const ORGANISER_INVITE_CODE = process.env.ORGANISER_INVITE_CODE || 'JOURNEY-ORG-2026';

module.exports = {
  protect,
  optionalAuth,
  generateToken,
  requireOrganiser,
  ORGANISER_INVITE_CODE,
  JWT_SECRET
};


