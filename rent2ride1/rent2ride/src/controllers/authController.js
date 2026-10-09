const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'rent2ride_default_jwt_secret_key_2026';

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, role = 'rider' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await query.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email is already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = await query.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), cleanEmail, hash, role]
    );

    const user = { id: result.lastID, name: name.trim(), email: cleanEmail, role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, token }
    });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await query.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: safeUser, token }
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
}

// Optional auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) {
      req.user = user;
    } else {
      req.user = null;
    }
    next();
  });
}

module.exports = {
  register,
  login,
  authenticateToken
};
