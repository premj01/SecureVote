import pool from '../config/db.js';
import { generateUniqueSessionCode } from '../utils/generateSessionCode.js';

// Create a new election
export async function createElection(req, res) {
  try {
    const { title, application_start, application_end, voting_start, voting_end } = req.body;
    const created_by = req.user.user_id;

    if (!title || !application_start || !application_end || !voting_start || !voting_end) {
      return res.status(400).json({ error: 'All fields are required: title, application_start, application_end, voting_start, voting_end.' });
    }

    // Validate time sequence
    const appStart = new Date(application_start);
    const appEnd = new Date(application_end);
    const voteStart = new Date(voting_start);
    const voteEnd = new Date(voting_end);

    if (appStart >= appEnd) {
      return res.status(400).json({ error: 'Application start must be before application end.' });
    }
    if (appEnd >= voteStart) {
      return res.status(400).json({ error: 'Application end must be before voting start.' });
    }
    if (voteStart >= voteEnd) {
      return res.status(400).json({ error: 'Voting start must be before voting end.' });
    }

    // Generate unique session code
    const session_code = await generateUniqueSessionCode(pool);

    // Determine initial status
    const now = new Date();
    let status = 'upcoming';
    if (now >= appStart && now < appEnd) status = 'application_open';
    else if (now >= appEnd && now < voteStart) status = 'application_closed';
    else if (now >= voteStart && now < voteEnd) status = 'voting_active';
    else if (now >= voteEnd) status = 'ended';

    const [result] = await pool.execute(
      `INSERT INTO elections (title, session_code, application_start, application_end, voting_start, voting_end, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, session_code, application_start, application_end, voting_start, voting_end, status, created_by]
    );

    res.status(201).json({
      message: 'Election created successfully.',
      election: {
        election_id: result.insertId,
        title,
        session_code,
        application_start,
        application_end,
        voting_start,
        voting_end,
        status
      }
    });
  } catch (err) {
    console.error('Create election error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Get all elections (admin view)
export async function getElections(req, res) {
  try {
    const [elections] = await pool.execute(
      `SELECT e.*,
              (SELECT COUNT(*) FROM candidate_applications ca WHERE ca.election_id = e.election_id) as total_applications,
              (SELECT COUNT(*) FROM candidate_applications ca WHERE ca.election_id = e.election_id AND ca.status = 'pending') as pending_applications,
              (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.election_id) as approved_candidates,
              (SELECT COUNT(*) FROM vote_tracking vt WHERE vt.election_id = e.election_id) as total_votes
       FROM elections e
       ORDER BY e.created_at DESC`
    );
    res.json({ elections });
  } catch (err) {
    console.error('Get elections error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Get candidate applications for an election
export async function getApplications(req, res) {
  try {
    const { id } = req.params;

    const [applications] = await pool.execute(
      `SELECT ca.*, u.full_name, u.voter_id, u.email
       FROM candidate_applications ca
       JOIN users u ON ca.user_id = u.user_id
       WHERE ca.election_id = ?
       ORDER BY ca.applied_at DESC`,
      [id]
    );

    res.json({ applications });
  } catch (err) {
    console.error('Get applications error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Approve candidate application
export async function approveApplication(req, res) {
  try {
    const { id } = req.params;
    const admin_id = req.user.user_id;

    // Get application
    const [apps] = await pool.execute(
      'SELECT * FROM candidate_applications WHERE application_id = ?',
      [id]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const app = apps[0];

    if (app.status !== 'pending') {
      return res.status(400).json({ error: `Application has already been ${app.status}.` });
    }

    // Check election voting hasn't started
    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id = ?',
      [app.election_id]
    );

    if (elections[0].status === 'voting_active' || elections[0].status === 'ended') {
      return res.status(400).json({ error: 'Cannot approve candidates after voting has started.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update application status
      await connection.execute(
        'UPDATE candidate_applications SET status = ?, verified_by = ?, verified_at = NOW() WHERE application_id = ?',
        ['approved', admin_id, id]
      );

      // Insert into candidates table
      await connection.execute(
        'INSERT INTO candidates (election_id, user_id, approved_at) VALUES (?, ?, NOW())',
        [app.election_id, app.user_id]
      );

      await connection.commit();
      res.json({ message: 'Candidate approved successfully.' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Approve application error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Reject candidate application
export async function rejectApplication(req, res) {
  try {
    const { id } = req.params;
    const admin_id = req.user.user_id;

    const [apps] = await pool.execute(
      'SELECT * FROM candidate_applications WHERE application_id = ?',
      [id]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (apps[0].status !== 'pending') {
      return res.status(400).json({ error: `Application has already been ${apps[0].status}.` });
    }

    await pool.execute(
      'UPDATE candidate_applications SET status = ?, verified_by = ?, verified_at = NOW() WHERE application_id = ?',
      ['rejected', admin_id, id]
    );

    res.json({ message: 'Candidate application rejected.' });
  } catch (err) {
    console.error('Reject application error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Pause voting
export async function pauseElection(req, res) {
  try {
    const { id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id = ?',
      [id]
    );

    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found.' });
    }

    if (elections[0].status !== 'voting_active') {
      return res.status(400).json({ error: 'Election is not currently in active voting.' });
    }

    await pool.execute(
      'UPDATE elections SET status = ? WHERE election_id = ?',
      ['paused', id]
    );

    res.json({ message: 'Voting paused successfully.' });
  } catch (err) {
    console.error('Pause election error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Resume voting
export async function resumeElection(req, res) {
  try {
    const { id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id = ?',
      [id]
    );

    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found.' });
    }

    if (elections[0].status !== 'paused') {
      return res.status(400).json({ error: 'Election is not paused.' });
    }

    await pool.execute(
      'UPDATE elections SET status = ? WHERE election_id = ?',
      ['voting_active', id]
    );

    res.json({ message: 'Voting resumed successfully.' });
  } catch (err) {
    console.error('Resume election error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// End voting
export async function endElection(req, res) {
  try {
    const { id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id = ?',
      [id]
    );

    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found.' });
    }

    if (elections[0].status === 'ended') {
      return res.status(400).json({ error: 'Election has already ended.' });
    }

    await pool.execute(
      'UPDATE elections SET status = ? WHERE election_id = ?',
      ['ended', id]
    );

    res.json({ message: 'Election ended successfully.' });
  } catch (err) {
    console.error('End election error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Get admin results with voter list (but no vote-candidate link)
export async function getAdminResults(req, res) {
  try {
    const { id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id = ?',
      [id]
    );

    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found.' });
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

    // Get voters who voted (but NOT who they voted for)
    const [voters] = await pool.execute(
      `SELECT u.full_name, u.voter_id, u.email, vt.voted_at
       FROM vote_tracking vt
       JOIN users u ON vt.user_id = u.user_id
       WHERE vt.election_id = ?
       ORDER BY vt.voted_at ASC`,
      [id]
    );

    const [totalVotes] = await pool.execute(
      'SELECT COUNT(*) as total FROM vote_tracking WHERE election_id = ?',
      [id]
    );

    res.json({
      election: elections[0],
      total_votes: totalVotes[0].total,
      results,
      voters
    });
  } catch (err) {
    console.error('Get admin results error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Get single election details
export async function getElectionDetails(req, res) {
  try {
    const { id } = req.params;

    const [elections] = await pool.execute(
      `SELECT e.*,
              (SELECT COUNT(*) FROM candidate_applications ca WHERE ca.election_id = e.election_id) as total_applications,
              (SELECT COUNT(*) FROM candidate_applications ca WHERE ca.election_id = e.election_id AND ca.status = 'pending') as pending_applications,
              (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.election_id) as approved_candidates,
              (SELECT COUNT(*) FROM vote_tracking vt WHERE vt.election_id = e.election_id) as total_votes
       FROM elections e
       WHERE e.election_id = ?`,
      [id]
    );

    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found.' });
    }

    res.json({ election: elections[0] });
  } catch (err) {
    console.error('Get election details error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
