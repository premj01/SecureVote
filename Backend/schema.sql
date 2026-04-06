-- Secure Election Voting System - Database Schema

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  voter_id VARCHAR(7) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('admin','voter') DEFAULT 'voter',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elections (
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
);

CREATE TABLE IF NOT EXISTS candidate_applications (
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
);

CREATE TABLE IF NOT EXISTS candidates (
  candidate_id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  user_id INT NOT NULL,
  symbol_name VARCHAR(100),
  approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(election_id, user_id),
  FOREIGN KEY (election_id) REFERENCES elections(election_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Anonymous votes table: NO user_id reference
CREATE TABLE IF NOT EXISTS votes (
  vote_id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  candidate_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(election_id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
);

-- Vote tracking: NO candidate reference, only tracks who voted
CREATE TABLE IF NOT EXISTS vote_tracking (
  tracking_id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  user_id INT NOT NULL,
  voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(election_id, user_id),
  FOREIGN KEY (election_id) REFERENCES elections(election_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Seed default admin account (password: admin123)
-- bcrypt hash of 'admin123' will be inserted by the seed script
