const jwt = require('jsonwebtoken');

const authenticateCustomer = (req, res, next) => {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.customer = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  if (token) {
    try {
      req.customer = jwt.verify(token, process.env.JWT_SECRET);
    } catch { /* ignore */ }
  }
  next();
};

const authenticateAdmin = (req, res, next) => {
  const token = req.cookies?.admin_token || req.headers?.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'manager' && decoded.role !== 'staff') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { authenticateCustomer, optionalAuth, authenticateAdmin };
