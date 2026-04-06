import pool from '../config/db.js';

// Get upcoming and active elections for voters
export async function getUpcomingElections(req, res) {
  try {
    const [elections] = await pool.execute(
      `SELECT e.election_id, e.title, e.session_code, e.application_start, e.application_end,
              e.voting_start, e.voting_end, e.status,
              (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.election_id) as candidate_count
       FROM elections e
       WHERE e.status IN ('upcoming', 'application_open', 'application_closed', 'voting_active')
       ORDER BY e.voting_start ASC`
    );
    res.json({ elections });
  } catch (err) {
    console.error('Get upcoming elections error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Find election by session code
export async function findByCode(req, res) {
  try {
    const { session_code } = req.body;
    const user_id = req.user.user_id;

    if (!session_code) {
      return res.status(400).json({ error: 'Session code is required.' });
    }

    // Find election
    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE session_code = ?',
      [session_code]
    );

    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found. Please check the Election ID.' });
    }

    const election = elections[0];

    // Check if voting is active
    if (election.status !== 'voting_active') {
      const statusMessages = {
        'upcoming': 'Voting has not started yet.',
        'application_open': 'Election is in candidate application phase.',
        'application_closed': 'Candidate applications are closed. Voting has not started yet.',
        'paused': 'Voting is currently paused.',
        'ended': 'Voting has ended for this election.'
      };
      return res.status(400).json({
        error: statusMessages[election.status] || 'Voting is not active.',
        election_status: election.status
      });
    }

    // Check if user already voted
    const [voteCheck] = await pool.execute(
      'SELECT tracking_id FROM vote_tracking WHERE election_id = ? AND user_id = ?',
      [election.election_id, user_id]
    );

    if (voteCheck.length > 0) {
      return res.status(400).json({
        error: 'You have already voted in this election.',
        already_voted: true,
        election: {
          election_id: election.election_id,
          title: election.title
        }
      });
    }

    // Get approved candidates
    const [candidates] = await pool.execute(
      `SELECT c.candidate_id, c.symbol_name, u.full_name, u.voter_id
       FROM candidates c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.election_id = ?
       ORDER BY u.full_name ASC`,
      [election.election_id]
    );

    res.json({
      election: {
        election_id: election.election_id,
        title: election.title,
        voting_end: election.voting_end
      },
      candidates
    });
  } catch (err) {
    console.error('Find by code error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Apply as candidate
export async function applyCandidate(req, res) {
  try {
    const { election_id, declaration_text } = req.body;
    const user_id = req.user.user_id;

    if (!election_id || !declaration_text) {
      return res.status(400).json({ error: 'Election ID and declaration text are required.' });
    }

    // Check election exists and application is open
    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id = ?',
      [election_id]
    );

    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found.' });
    }

    const election = elections[0];
    const now = new Date();
    const appStart = new Date(election.application_start);
    const appEnd = new Date(election.application_end);

    if (now < appStart) {
      return res.status(400).json({ error: 'Candidate application period has not started yet.' });
    }
    if (now > appEnd) {
      return res.status(400).json({ error: 'Candidate application period has ended.' });
    }

    // Check if already applied
    const [existing] = await pool.execute(
      'SELECT application_id FROM candidate_applications WHERE election_id = ? AND user_id = ?',
      [election_id, user_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'You have already applied for this election.' });
    }

    // Insert application
    await pool.execute(
      'INSERT INTO candidate_applications (election_id, user_id, declaration_text, applied_at) VALUES (?, ?, ?, NOW())',
      [election_id, user_id, declaration_text]
    );

    res.status(201).json({ message: 'Candidate application submitted successfully.' });
  } catch (err) {
    console.error('Apply candidate error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Get election results
export async function getResults(req, res) {
  try {
    const { id } = req.params;

    // Get election
    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id = ?',
      [id]
    );

    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found.' });
    }

    const election = elections[0];
    const now = new Date();
    const votingEnd = new Date(election.voting_end);

    // Check if voting has ended
    if (now < votingEnd && election.status !== 'ended') {
      return res.json({
        election: {
          election_id: election.election_id,
          title: election.title,
          voting_end: election.voting_end,
          status: election.status
        },
        results_available: false,
        message: 'Results will be available after voting ends.'
      });
    }

    // Get results
    const [results] = await pool.execute(
      `SELECT c.candidate_id, u.full_name, u.voter_id, c.symbol_name,
              COUNT(v.vote_id) as vote_count
       FROM candidates c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN votes v ON v.candidate_id = c.candidate_id AND v.election_id = c.election_id
       WHERE c.election_id = ?
       GROUP BY c.candidate_id, u.full_name, u.voter_id, c.symbol_name
       ORDER BY vote_count DESC`,
      [id]
    );

    // Get total votes
    const [totalVotes] = await pool.execute(
      'SELECT COUNT(*) as total FROM vote_tracking WHERE election_id = ?',
      [id]
    );

    res.json({
      election: {
        election_id: election.election_id,
        title: election.title,
        voting_end: election.voting_end,
        status: election.status
      },
      results_available: true,
      total_votes: totalVotes[0].total,
      results
    });
  } catch (err) {
    console.error('Get results error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Get user's voting history
export async function getVotingHistory(req, res) {
  try {
    const user_id = req.user.user_id;

    const [history] = await pool.execute(
      `SELECT e.election_id, e.title, e.status, e.voting_end, vt.voted_at
       FROM vote_tracking vt
       JOIN elections e ON vt.election_id = e.election_id
       WHERE vt.user_id = ?
       ORDER BY vt.voted_at DESC`,
      [user_id]
    );

    res.json({ history });
  } catch (err) {
    console.error('Get voting history error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Get user's candidate applications
export async function getMyApplications(req, res) {
  try {
    const user_id = req.user.user_id;

    const [applications] = await pool.execute(
      `SELECT ca.application_id, ca.status, ca.applied_at, ca.declaration_text,
              e.election_id, e.title, e.application_start, e.application_end,
              e.voting_start, e.voting_end, e.status as election_status
       FROM candidate_applications ca
       JOIN elections e ON ca.election_id = e.election_id
       WHERE ca.user_id = ?
       ORDER BY ca.applied_at DESC`,
      [user_id]
    );

    res.json({ applications });
  } catch (err) {
    console.error('Get my applications error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
