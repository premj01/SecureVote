import { castVote } from '../services/votingService.js';
import pool from '../config/db.js';
import { createOtpChallenge, verifyOtpChallengeAndConsume } from '../services/otpService.js';
import { sendOtpEmail } from '../services/emailService.js';

export async function vote(req, res) {
  return verifyVoteOtpAndCastVote(req, res);
}

export async function requestVoteOtp(req, res) {
  try {
    const { election_id, candidate_id } = req.body;
    const user_id = req.user.user_id;

    if (!election_id || !candidate_id) {
      return res.status(400).json({ error: 'Election ID and candidate ID are required.' });
    }

    const [users] = await pool.execute('SELECT email FROM users WHERE user_id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const [elections] = await pool.execute('SELECT * FROM elections WHERE election_id = ?', [election_id]);
    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found.' });
    }

    if (elections[0].status !== 'voting_active') {
      return res.status(400).json({ error: 'Voting is not currently active for this election.' });
    }

    const [candidateRows] = await pool.execute(
      'SELECT candidate_id FROM candidates WHERE candidate_id = ? AND election_id = ?',
      [candidate_id, election_id]
    );
    if (candidateRows.length === 0) {
      return res.status(404).json({ error: 'Invalid candidate for this election.' });
    }

    const [existingVote] = await pool.execute(
      'SELECT tracking_id FROM vote_tracking WHERE election_id = ? AND user_id = ?',
      [election_id, user_id]
    );
    if (existingVote.length > 0) {
      return res.status(409).json({ error: 'You have already voted in this election.' });
    }

    const otp = await createOtpChallenge({
      purpose: 'vote',
      user_id,
      election_id,
      payload: { candidate_id: Number(candidate_id) }
    });

    await sendOtpEmail(users[0].email, otp, 'voting confirmation');

    res.json({ message: 'OTP sent. Please verify OTP to cast your vote.' });
  } catch (err) {
    console.error('Request vote OTP error:', err.message);

    if (err.message.includes('Please wait')) {
      return res.status(429).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function verifyVoteOtpAndCastVote(req, res) {
  try {
    const { election_id, otp } = req.body;
    const user_id = req.user.user_id;

    if (!election_id || !otp) {
      return res.status(400).json({ error: 'Election ID and OTP are required.' });
    }

    const challenge = await verifyOtpChallengeAndConsume({
      purpose: 'vote',
      user_id,
      election_id,
      otp
    });

    const candidate_id = challenge.payload?.candidate_id;
    if (!candidate_id) {
      return res.status(400).json({ error: 'Invalid vote session. Please request OTP again.' });
    }

    const result = await castVote(user_id, election_id, candidate_id);
    res.json(result);
  } catch (err) {
    console.error('Vote error:', err.message);

    if (err.message.includes('already voted')) {
      return res.status(409).json({ error: err.message });
    }
    if (err.message.includes('not found') || err.message.includes('Invalid candidate')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('not currently active') || err.message.includes('outside')) {
      return res.status(400).json({ error: err.message });
    }
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
