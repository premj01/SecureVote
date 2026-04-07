import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { generateUniqueVoterId } from '../utils/generateVoterId.js';
import { createOtpChallenge, verifyOtpChallengeAndConsume } from '../services/otpService.js';
import { sendOtpEmail } from '../services/emailService.js';

export async function register(req, res) {
  return requestRegistrationOtp(req, res);
}

export async function requestRegistrationOtp(req, res) {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    // Check if email already exists
    const [existing] = await pool.execute('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const otp = await createOtpChallenge({
      purpose: 'registration',
      email,
      payload: {
        full_name,
        password_hash
      }
    });

    await sendOtpEmail(email, otp, 'registration verification');

    res.status(200).json({
      message: 'OTP sent successfully. Please verify to complete registration.'
    });
  } catch (err) {
    console.error('Request registration OTP error:', err);

    if (err.message.includes('Please wait')) {
      return res.status(429).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function verifyRegistrationOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const challenge = await verifyOtpChallengeAndConsume({
      purpose: 'registration',
      email,
      otp
    });

    const full_name = challenge.payload?.full_name;
    const password_hash = challenge.payload?.password_hash;

    if (!full_name || !password_hash) {
      return res.status(400).json({ error: 'Invalid registration payload. Please request OTP again.' });
    }

    const [existing] = await pool.execute('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Generate unique voter ID
    const voter_id = await generateUniqueVoterId(pool);

    // Insert user
    const [result] = await pool.execute(
      'INSERT INTO users (voter_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [voter_id, email, password_hash, full_name, 'voter']
    );

    // Generate JWT
    const token = jwt.sign(
      { user_id: result.insertId, email, role: 'voter', voter_id, full_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        user_id: result.insertId,
        voter_id,
        email,
        full_name,
        role: 'voter'
      }
    });
  } catch (err) {
    console.error('Verify registration OTP error:', err);

    if (
      err.message.includes('OTP') ||
      err.message.includes('Invalid') ||
      err.message.includes('expired') ||
      err.message.includes('attempts')
    ) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        voter_id: user.voter_id,
        full_name: user.full_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        voter_id: user.voter_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
