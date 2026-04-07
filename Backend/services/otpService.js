import crypto from 'crypto';
import pool from '../config/db.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const OTP_COOLDOWN_SECONDS = parseInt(process.env.OTP_COOLDOWN_SECONDS || '60', 10);

function getOtpSecret() {
    return process.env.OTP_SECRET || process.env.JWT_SECRET || 'securevote-otp-secret';
}

export function generateOtpCode() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
    return crypto
        .createHmac('sha256', getOtpSecret())
        .update(otp)
        .digest('hex');
}

function getScopeClause({ purpose, email, user_id, election_id }) {
    if (purpose === 'registration') {
        return {
            sql: 'purpose = ? AND email = ?',
            params: [purpose, email]
        };
    }

    return {
        sql: 'purpose = ? AND user_id = ? AND election_id = ?',
        params: [purpose, user_id, election_id]
    };
}

export async function createOtpChallenge({ purpose, email = null, user_id = null, election_id = null, payload = null }) {
    const scope = getScopeClause({ purpose, email, user_id, election_id });

    const [recentRows] = await pool.execute(
        `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS elapsed_seconds
     FROM otp_challenges
     WHERE ${scope.sql} AND consumed_at IS NULL
     ORDER BY otp_id DESC
     LIMIT 1`,
        scope.params
    );

    if (recentRows.length > 0 && recentRows[0].elapsed_seconds < OTP_COOLDOWN_SECONDS) {
        const waitSeconds = OTP_COOLDOWN_SECONDS - recentRows[0].elapsed_seconds;
        throw new Error(`Please wait ${waitSeconds} seconds before requesting a new OTP.`);
    }

    await pool.execute(
        `UPDATE otp_challenges
     SET consumed_at = NOW()
     WHERE ${scope.sql} AND consumed_at IS NULL`,
        scope.params
    );

    const otp = generateOtpCode();
    const otpHash = hashOtp(otp);

    await pool.execute(
        `INSERT INTO otp_challenges
      (purpose, email, user_id, election_id, otp_hash, payload_json, expires_at, max_attempts)
     VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)`,
        [
            purpose,
            email,
            user_id,
            election_id,
            otpHash,
            payload ? JSON.stringify(payload) : null,
            OTP_EXPIRY_MINUTES,
            OTP_MAX_ATTEMPTS
        ]
    );

    return otp;
}

export async function verifyOtpChallengeAndConsume({ purpose, otp, email = null, user_id = null, election_id = null }) {
    const scope = getScopeClause({ purpose, email, user_id, election_id });

    const [rows] = await pool.execute(
        `SELECT *
     FROM otp_challenges
     WHERE ${scope.sql}
       AND consumed_at IS NULL
       AND expires_at > NOW()
     ORDER BY otp_id DESC
     LIMIT 1`,
        scope.params
    );

    if (rows.length === 0) {
        throw new Error('OTP not found or expired. Please request a new OTP.');
    }

    const challenge = rows[0];

    if (challenge.attempts >= challenge.max_attempts) {
        await pool.execute('UPDATE otp_challenges SET consumed_at = NOW() WHERE otp_id = ?', [challenge.otp_id]);
        throw new Error('Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    const incomingHash = hashOtp(otp);
    if (incomingHash !== challenge.otp_hash) {
        await pool.execute(
            `UPDATE otp_challenges
       SET attempts = attempts + 1,
           consumed_at = CASE WHEN attempts + 1 >= max_attempts THEN NOW() ELSE consumed_at END
       WHERE otp_id = ?`,
            [challenge.otp_id]
        );
        throw new Error('Invalid OTP.');
    }

    await pool.execute(
        'UPDATE otp_challenges SET verified_at = NOW(), consumed_at = NOW() WHERE otp_id = ?',
        [challenge.otp_id]
    );

    let payload = null;
    if (challenge.payload_json) {
        try {
            payload = JSON.parse(challenge.payload_json);
        } catch (err) {
            payload = null;
        }
    }

    return {
        otp_id: challenge.otp_id,
        purpose: challenge.purpose,
        payload
    };
}
