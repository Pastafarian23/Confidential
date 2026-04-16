const { Pool } = require('pg');
const path = require('path');

// Railway provides DATABASE_URL, otherwise use local
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/confidential';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Initialize tables
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        capabilities TEXT,
        balance REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        status TEXT DEFAULT 'open',
        requester_id TEXT,
        worker_id TEXT,
        result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        from_agent_id TEXT,
        to_agent_id TEXT,
        amount REAL,
        type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Database tables initialized');
  } finally {
    client.release();
  }
}

// Helper to run queries
const db = {
  query: (text, params) => pool.query(text, params),
  get: async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows[0];
  },
  all: async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows;
  }
};

module.exports = { pool, db, initDatabase };