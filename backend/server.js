// server.js  – Main entry point
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

const authRoutes  = require('./routes/auth');
const chatRoutes  = require('./routes/chat');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security ─────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(cors({
  origin:      [
    process.env.CORS_ORIGIN || 'http://127.0.0.1:5500',
    'http://localhost:5500',
    'null'                      // for file:// during dev
  ],
  credentials: true
}));

// ── Rate limiting ─────────────────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 min
  max: 20,
  message: { error: 'Too many requests. Please wait.' }
}));

app.use('/api/chat', rateLimit({
  windowMs: 60 * 1000,         // 1 min
  max: 60,
  message: { error: 'Rate limit exceeded.' }
}));

// ── Body parser ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  console.log(`📡  Health: http://localhost:${PORT}/api/health`);
});
