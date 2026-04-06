import pool from './config/db.js';

async function test() {
  const [elections] = await pool.execute('SELECT title, application_start, application_end FROM elections ORDER BY election_id DESC LIMIT 3');
  console.log("DB raw data:", JSON.stringify(elections, null, 2));
  process.exit(0);
}
test();
