/**
 * Authentication routes and middleware.
 * Uses JWT tokens and bcrypt password hashing.
 */
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/queries');

const router = express.Router();

const SALT_ROUNDS = 10;

// ── POST /api/auth/register ────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await db.createUser(username, email, passwordHash);

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.status(201).json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    console.error('[auth] Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (err) {
    console.error('[auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error('[auth] Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── JWT middleware ──────────────────────────────────────────

function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;
