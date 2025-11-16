// middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

// ساده‌ترین پیاده‌سازی blacklist توکن (در حافظه؛ برای production از Redis یا DB استفاده کنید)
const tokenBlacklist = new Map(); // token -> expiryTimestamp

// پاک‌سازی توکن‌های منقضی شده (هر بار که middleware فراخوانی می‌شود)
function cleanupBlacklist() {
  const now = Date.now();
  for (const [token, exp] of tokenBlacklist.entries()) {
    if (exp <= now) tokenBlacklist.delete(token);
  }
}

function verifyToken(req, res, next) {
  cleanupBlacklist();
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'توکن ارسال نشده' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'فرمت توکن نادرست است' });

  const token = parts[1];
  if (tokenBlacklist.has(token)) return res.status(401).json({ message: 'توکن منقضی شده (logout شده)' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'توکن نامعتبر است', error: err.message });
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'احراز هویت لازم است' });
    if (req.user.role !== role) return res.status(403).json({ message: 'دسترسی کافی نیست' });
    next();
  };
}

// logout: افزودن توکن به blacklist (token باید از header ارسال شود)
function logoutToken(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ message: 'توکن برای logout ارسال نشده' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.decode(token);
    const expMs = payload && payload.exp ? payload.exp * 1000 : Date.now() + (60 * 60 * 1000);
    tokenBlacklist.set(token, expMs);
    res.json({ message: 'خروج با موفقیت انجام شد' });
  } catch (err) {
    res.status(400).json({ message: 'خطا در logout', error: err.message });
  }
}

module.exports = { verifyToken, requireRole, logoutToken, tokenBlacklist };
