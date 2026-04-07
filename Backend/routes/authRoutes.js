import express from 'express';
import {
    register,
    login,
    requestRegistrationOtp,
    verifyRegistrationOtp
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/register/request-otp', requestRegistrationOtp);
router.post('/register/verify-otp', verifyRegistrationOtp);
router.post('/login', login);

export default router;
