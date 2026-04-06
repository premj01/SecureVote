import pool from './Backend/config/db.js';

async function test() {
  const [elections] = await pool.execute('SELECT title, application_start FROM elections ORDER BY election_id DESC LIMIT 2');
  console.log("DB raw data:", elections);
  process.exit(0);
}
test();
