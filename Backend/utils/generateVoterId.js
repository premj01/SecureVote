/**
 * Generates a unique 7-character voter ID
 * Format: VOT + 4 random digits (e.g., VOT4821)
 */
export function generateVoterId() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `VOT${digits}`;
}

/**
 * Generates a unique voter ID that doesn't exist in the database
 */
export async function generateUniqueVoterId(pool) {
  let voterId;
  let exists = true;

  while (exists) {
    voterId = generateVoterId();
    const [rows] = await pool.execute(
      'SELECT voter_id FROM users WHERE voter_id = ?',
      [voterId]
    );
    exists = rows.length > 0;
  }

  return voterId;
}
