import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getUpcomingElections,
  findByCode,
  applyCandidate,
  getResults,
  getVotingHistory,
  getMyApplications
} from '../controllers/electionController.js';
import { vote } from '../controllers/voteController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/upcoming', getUpcomingElections);
router.post('/find-by-code', findByCode);
router.post('/apply-candidate', applyCandidate);
router.post('/vote', vote);
router.get('/result/:id', getResults);
router.get('/history', getVotingHistory);
router.get('/my-applications', getMyApplications);

export default router;
