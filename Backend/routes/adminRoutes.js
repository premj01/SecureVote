import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import {
  createElection,
  getElections,
  getApplications,
  approveApplication,
  rejectApplication,
  pauseElection,
  resumeElection,
  endElection,
  getAdminResults,
  getElectionDetails
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/create-election', createElection);
router.get('/elections', getElections);
router.get('/election/:id', getElectionDetails);
router.get('/election/:id/applications', getApplications);
router.patch('/application/:id/approve', approveApplication);
router.patch('/application/:id/reject', rejectApplication);
router.patch('/election/:id/pause', pauseElection);
router.patch('/election/:id/resume', resumeElection);
router.patch('/election/:id/end', endElection);
router.get('/results/:id', getAdminResults);

export default router;
