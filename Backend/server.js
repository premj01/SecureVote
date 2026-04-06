import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Force Node.js timezone to Indian Standard Time
process.env.TZ = 'Asia/Kolkata';

import authRoutes from './routes/authRoutes.js';
import electionRoutes from './routes/electionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { startScheduler } from './services/schedulerService.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Start the election status scheduler
  startScheduler();
});
