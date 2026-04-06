/**
 * Generates a 6-digit session code for elections
 * Format: 6 random digits (e.g., 483291)
 */
export function generateSessionCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a unique session code that doesn't exist in the database
 */
export async function generateUniqueSessionCode(pool) {
  let code;
  let exists = true;

  while (exists) {
    code = generateSessionCode();
    const [rows] = await pool.execute(
      'SELECT session_code FROM elections WHERE session_code = ?',
      [code]
    );
    exists = rows.length > 0;
  }

  return code;
}
