import pool from '../config/db.js';

/**
 * Voting service with transaction-based anonymous voting
 * - votes table: stores candidate_id (no user reference)
 * - vote_tracking table: stores user_id (no candidate reference)
 * This ensures vote anonymity.
 */
export async function castVote(user_id, election_id, candidate_id) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify election is active
    const [elections] = await connection.execute(
      'SELECT * FROM elections WHERE election_id = ? FOR UPDATE',
      [election_id]
    );

    if (elections.length === 0) {
      throw new Error('Election not found.');
    }

    const election = elections[0];
    if (election.status !== 'voting_active') {
      throw new Error('Voting is not currently active for this election.');
    }

    // Check voting time window
    const now = new Date();
    const votingStart = new Date(election.voting_start);
    const votingEnd = new Date(election.voting_end);

    if (now < votingStart || now > votingEnd) {
      throw new Error('Voting is outside the allowed time window.');
    }

    // 2. Check if user has already voted (prevents double voting)
    const [existingVote] = await connection.execute(
      'SELECT tracking_id FROM vote_tracking WHERE election_id = ? AND user_id = ? FOR UPDATE',
      [election_id, user_id]
    );

    if (existingVote.length > 0) {
      throw new Error('You have already voted in this election.');
    }

    // 3. Verify candidate is approved for this election
    const [candidates] = await connection.execute(
      'SELECT candidate_id FROM candidates WHERE candidate_id = ? AND election_id = ?',
      [candidate_id, election_id]
    );

    if (candidates.length === 0) {
      throw new Error('Invalid candidate for this election.');
    }

    // 4. Insert anonymous vote (no user reference)
    await connection.execute(
      'INSERT INTO votes (election_id, candidate_id, created_at) VALUES (?, ?, NOW())',
      [election_id, candidate_id]
    );

    // 5. Track that user voted (no candidate reference)
    await connection.execute(
      'INSERT INTO vote_tracking (election_id, user_id, voted_at) VALUES (?, ?, NOW())',
      [election_id, user_id]
    );

    // 6. Commit transaction
    await connection.commit();

    return { success: true, message: 'Voted successfully.' };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
