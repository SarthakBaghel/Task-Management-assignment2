const express = require('express');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const env = require('../config/env');
const {
  validate,
  registerSchema,
  loginSchema,
} = require('../middleware/validation');

const router = express.Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function userResponse(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

router.post(
  '/register',
  validate(registerSchema),
  wrap(async (req, res) => {
    const email = req.body.email.trim().toLowerCase();

    const { rows: existingRows } = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingRows.length > 0) {
      throw createError(409, 'Email is already registered');
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);

    const { rows } = await pool.query(
      `
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email, created_at, updated_at
      `,
      [email, passwordHash]
    );

    return res.status(201).json({
      success: true,
      data: {
        user: userResponse(rows[0]),
      },
    });
  })
);

router.post(
  '/login',
  validate(loginSchema),
  wrap(async (req, res) => {
    const email = req.body.email.trim().toLowerCase();

    const { rows } = await pool.query(
      `
        SELECT id, email, password_hash, created_at, updated_at
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email]
    );

    const user = rows[0];

    if (!user) {
      throw createError(401, 'Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      req.body.password,
      user.password_hash
    );

    if (!passwordMatches) {
      throw createError(401, 'Invalid email or password');
    }

    const token = jwt.sign(
      {
        sub: String(user.id),
        email: user.email,
      },
      env.jwtSecret,
      {
        expiresIn: env.jwtExpiresIn,
      }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: userResponse(user),
      },
    });
  })
);

router.get(
  '/me',
  auth,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      `
        SELECT id, email, created_at, updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.id]
    );

    const user = rows[0];

    if (!user) {
      throw createError(404, 'User not found');
    }

    return res.json({
      success: true,
      data: {
        user: userResponse(user),
      },
    });
  })
);

module.exports = router;
