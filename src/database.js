const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'marketplace.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'human' or 'ai'
    capabilities TEXT, -- JSON array of what they can do
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'completed', 'cancelled'
    requester_id TEXT,
    worker_id TEXT,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    from_agent_id TEXT,
    to_agent_id TEXT,
    amount REAL,
    type TEXT, -- 'payment', 'deposit', 'withdrawal'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;