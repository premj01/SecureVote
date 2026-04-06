import pool from '../config/db.js';

/**
 * Clock-based scheduler service
 * Automatically transitions election statuses based on current time:
 * - upcoming → application_open (when application_start is reached)
 * - application_open → application_closed (when application_end is reached)
 * - application_closed → voting_active (when voting_start is reached)
 * - voting_active → ended (when voting_end is reached)
 *
 * Runs every 30 seconds to check and update.
 * "Paused" elections are NOT auto-transitioned.
 */

let schedulerInterval = null;

export async function updateElectionStatuses() {
  try {
    const d = new Date();
    const now = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

    // upcoming → application_open
    await pool.execute(
      `UPDATE elections SET status = 'application_open'
       WHERE status = 'upcoming' AND application_start <= ?`,
      [now]
    );

    // application_open → application_closed
    await pool.execute(
      `UPDATE elections SET status = 'application_closed'
       WHERE status = 'application_open' AND application_end <= ?`,
      [now]
    );

    // application_closed → voting_active
    await pool.execute(
      `UPDATE elections SET status = 'voting_active'
       WHERE status = 'application_closed' AND voting_start <= ?`,
      [now]
    );

    // voting_active → ended (skip paused elections)
    await pool.execute(
      `UPDATE elections SET status = 'ended'
       WHERE status = 'voting_active' AND voting_end <= ?`,
      [now]
    );
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
}

export function startScheduler() {
  console.log('🕐 Election status scheduler started (every 30s)');

  // Run immediately on start
  updateElectionStatuses();

  // Then run every 30 seconds
  schedulerInterval = setInterval(updateElectionStatuses, 30000);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('🕐 Election status scheduler stopped');
  }
}
