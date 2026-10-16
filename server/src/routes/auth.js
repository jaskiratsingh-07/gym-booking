const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../db');
const { badRequest, unauthorized, conflict } = require('../errors');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw badRequest('Invalid input', details);
  }
  return result.data;
}

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = parse(registerSchema, req.body);

    const hash = await bcrypt.hash(password, 10);

    let user;
    try {
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, role`,
        [name, email, hash]
      );
      user = result.rows[0];
    } catch (err) {
      if (err.code === '23505') throw conflict('Email already registered');
      throw err;
    }

    res.status(201).json({ token: makeToken(user), user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = parse(loginSchema, req.body);

    const result = await pool.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = $1',
      [email]
    );
    const row = result.rows[0];

    const ok = row && (await bcrypt.compare(password, row.password_hash));
    if (!ok) throw unauthorized('Invalid email or password');

    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    res.json({ token: makeToken(user), user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;