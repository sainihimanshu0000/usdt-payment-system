const getClientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  req.ip ||
  'unknown';

const getRequestMeta = (req) => ({
  ip: getClientIp(req),
  device: req.headers['user-agent'] || 'unknown'
});

const makeTxnId = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TXN${stamp}${rand}`;
};

module.exports = { getClientIp, getRequestMeta, makeTxnId };
