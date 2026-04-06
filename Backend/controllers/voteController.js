import { castVote } from '../services/votingService.js';

export async function vote(req, res) {
  try {
    const { election_id, candidate_id } = req.body;
    const user_id = req.user.user_id;

    if (!election_id || !candidate_id) {
      return res.status(400).json({ error: 'Election ID and candidate ID are required.' });
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

    res.status(500).json({ error: 'Internal server error.' });
  }
}
