// routes/auth.js
const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db       = require('../db');
const router   = express.Router();

const SALT_ROUNDS = 10;
const JWT_SECRET  = process.env.JWT_SECRET || 'secret';

// ── Helper: issue token ──────────────────────────────────────
function issueToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, preferred_lang = 'en' } = req.body;

    // Validation
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields are required.' });

    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username))
      return res.status(400).json({ error: 'Username must be 3-50 alphanumeric characters.' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address.' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    // Check duplicates
    const [rows] = await db.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?', [email, username]
    );
    if (rows.length)
      return res.status(409).json({ error: 'Email or username already exists.' });

    const password_hash  = await bcrypt.hash(password, SALT_ROUNDS);
    const verify_token   = uuidv4();

    const [result] = await db.execute(
      'INSERT INTO users (username, email, password_hash, preferred_lang, verify_token) VALUES (?,?,?,?,?)',
      [username, email, password_hash, preferred_lang, verify_token]
    );

    const user  = { id: result.insertId, username, email };
    const token = issueToken(user);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: user.id, username, email, preferred_lang, is_verified: false }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = issueToken(user);

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id:             user.id,
        username:       user.username,
        email:          user.email,
        preferred_lang: user.preferred_lang,
        is_verified:    user.is_verified
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── GET /api/auth/verify-email?token=xxx ────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token missing.' });

    const [rows] = await db.execute('SELECT id FROM users WHERE verify_token = ?', [token]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired token.' });

    await db.execute(
      'UPDATE users SET is_verified = TRUE, verify_token = NULL WHERE id = ?',
      [rows[0].id]
    );
    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
