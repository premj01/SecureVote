import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import pool from './config/db.js';

dotenv.config();

async function seed() {
  try {
    console.log('🔧 Running database schema...');

    // Create tables in order (respecting foreign key dependencies)
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        voter_id VARCHAR(7) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role ENUM('admin','voter') DEFAULT 'voter',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS elections (
        election_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        session_code CHAR(6) UNIQUE NOT NULL,
        application_start DATETIME NOT NULL,
        application_end DATETIME NOT NULL,
        voting_start DATETIME NOT NULL,
        voting_end DATETIME NOT NULL,
        status ENUM('upcoming','application_open','application_closed','voting_active','paused','ended') DEFAULT 'upcoming',
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(user_id)
      )`,

      `CREATE TABLE IF NOT EXISTS otp_challenges (
        otp_id INT AUTO_INCREMENT PRIMARY KEY,
        purpose ENUM('registration','vote') NOT NULL,
        email VARCHAR(255),
        user_id INT,
        election_id INT,
        otp_hash CHAR(64) NOT NULL,
        payload_json TEXT,
        expires_at DATETIME NOT NULL,
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        verified_at DATETIME,
        consumed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otp_email_purpose (email, purpose, consumed_at, expires_at),
        INDEX idx_otp_user_election_purpose (user_id, election_id, purpose, consumed_at, expires_at),
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (election_id) REFERENCES elections(election_id)
      )`,

      `CREATE TABLE IF NOT EXISTS candidate_applications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        election_id INT NOT NULL,
        user_id INT NOT NULL,
        declaration_text TEXT NOT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_by INT,
        verified_at DATETIME,
        UNIQUE(election_id, user_id),
        FOREIGN KEY (election_id) REFERENCES elections(election_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (verified_by) REFERENCES users(user_id)
      )`,

      `CREATE TABLE IF NOT EXISTS candidates (
        candidate_id INT AUTO_INCREMENT PRIMARY KEY,
        election_id INT NOT NULL,
        user_id INT NOT NULL,
        symbol_name VARCHAR(100),
        approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(election_id, user_id),
        FOREIGN KEY (election_id) REFERENCES elections(election_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,

      `CREATE TABLE IF NOT EXISTS votes (
        vote_id INT AUTO_INCREMENT PRIMARY KEY,
        election_id INT NOT NULL,
        candidate_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (election_id) REFERENCES elections(election_id),
        FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
      )`,

      `CREATE TABLE IF NOT EXISTS vote_tracking (
        tracking_id INT AUTO_INCREMENT PRIMARY KEY,
        election_id INT NOT NULL,
        user_id INT NOT NULL,
        voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(election_id, user_id),
        FOREIGN KEY (election_id) REFERENCES elections(election_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`
    ];

    for (const sql of statements) {
      await pool.execute(sql);
    }

    console.log('✅ Schema created successfully');

    console.log('🧹 Clearing existing data (preserving admin users)...');

    // Temporarily disable FK checks so truncation order issues cannot break reset.
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    try {
      await pool.execute('TRUNCATE TABLE vote_tracking');
      await pool.execute('TRUNCATE TABLE votes');
      await pool.execute('TRUNCATE TABLE candidates');
      await pool.execute('TRUNCATE TABLE candidate_applications');
      await pool.execute('TRUNCATE TABLE otp_challenges');
      await pool.execute('TRUNCATE TABLE elections');
      await pool.execute("DELETE FROM users WHERE role <> 'admin'");
    } finally {
      await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
    }

    console.log('✅ Data cleared; admin users preserved');

    // Check if admin exists
    const [admins] = await pool.execute('SELECT user_id FROM users WHERE email = ?', ['admin@election.com']);

    if (admins.length === 0) {
      console.log('🔧 Creating default admin account...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);

      await pool.execute(
        'INSERT INTO users (voter_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
        ['ADM0001', 'admin@election.com', passwordHash, 'System Admin', 'admin']
      );
      console.log('✅ Admin account created (admin@election.com / admin123)');
    } else {
      console.log('ℹ️  Admin account already exists');
    }

    console.log('🎉 Seed completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
