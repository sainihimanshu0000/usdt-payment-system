const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/TokenBlacklist');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const isBlacklisted = async (token) => {
  const entry = await TokenBlacklist.findOne({ tokenHash: hashToken(token) });
  return !!entry;
};

const revokeToken = async (token, extra = {}) => {
  const decoded = jwt.decode(token) || {};
  const expiresAt = decoded.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await TokenBlacklist.updateOne(
    { tokenHash: hashToken(token) },
    {
      tokenHash: hashToken(token),
      expiresAt,
      userId: extra.userId,
      role: extra.role
    },
    { upsert: true }
  );
};

module.exports = { getBearerToken, isBlacklisted, revokeToken };
