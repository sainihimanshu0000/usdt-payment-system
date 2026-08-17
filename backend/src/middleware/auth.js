const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { getBearerToken, isBlacklisted } = require('../utils/token');

const rejectIfRevoked = async (token) => {
  if (await isBlacklisted(token)) {
    const error = new Error('Token revoked');
    error.status = 401;
    throw error;
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    await rejectIfRevoked(token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized - Admin not found' });
    }

    req.admin = admin;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message === 'Token revoked' ? 'Token revoked' : 'Invalid token' });
  }
};

const verifyUser = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    await rejectIfRevoked(token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    if (user.status === 'disabled') {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message === 'Token revoked' ? 'Token revoked' : 'Invalid token' });
  }
};

const verifyAny = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    await rejectIfRevoked(token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.id);
    if (admin) {
      req.admin = admin;
      req.role = 'admin';
      req.token = token;
      return next();
    }

    const user = await User.findById(decoded.id);
    if (user) {
      if (user.status === 'disabled') {
        return res.status(401).json({ error: 'Account is disabled' });
      }
      req.user = user;
      req.role = 'user';
      req.token = token;
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    return res.status(401).json({ error: error.message === 'Token revoked' ? 'Token revoked' : 'Invalid token' });
  }
};

module.exports = { verifyAdmin, verifyUser, verifyAny };
