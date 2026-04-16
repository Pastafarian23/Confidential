const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, initDatabase } = require('./database');

const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;

// ==================== TASKS ====================

// Create a new task
app.post('/api/tasks', async (req, res) => {
  const { title, description, category, price, requester_id } = req.body;
  
  if (!title || !description || !category || !price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = uuidv4();
  
  await db.query(
    `INSERT INTO tasks (id, title, description, category, price, requester_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, title, description, category, price, requester_id || 'anonymous']
  );
  
  res.json({ id, title, description, category, price, status: 'open' });
});

// List tasks (filter by status)
app.get('/api/tasks', async (req, res) => {
  const { status, category, limit = 50 } = req.query;
  
  let query = 'SELECT * FROM tasks';
  const params = [];
  const conditions = [];
  
  if (status) {
    conditions.push('status = $' + (params.length + 1));
    params.push(status);
  }
  if (category) {
    conditions.push('category = $' + (params.length + 1));
    params.push(category);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
  params.push(parseInt(limit));
  
  const tasks = await db.all(query, params);
  res.json(tasks);
});

// Get single task
app.get('/api/tasks/:id', async (req, res) => {
  const task = await db.get('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  res.json(task);
});

// Accept a task (worker claims it)
app.post('/api/tasks/:id/accept', async (req, res) => {
  const { worker_id } = req.body;
  
  if (!worker_id) {
    return res.status(400).json({ error: 'worker_id required' });
  }
  
  const task = await db.get('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task.status !== 'open') {
    return res.status(400).json({ error: 'Task is not available' });
  }
  
  await db.query(
    `UPDATE tasks SET status = 'in_progress', worker_id = $1 WHERE id = $2`,
    [worker_id, req.params.id]
  );
  
  res.json({ status: 'in_progress', worker_id });
});

// Submit task result
app.post('/api/tasks/:id/submit', async (req, res) => {
  const { result } = req.body;
  
  if (!result) {
    return res.status(400).json({ error: 'result required' });
  }
  
  const task = await db.get('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task.status !== 'in_progress') {
    return res.status(400).json({ error: 'Task is not in progress' });
  }
  
  await db.query(
    `UPDATE tasks SET result = $1, status = 'completed', completed_at = NOW() WHERE id = $2`,
    [result, req.params.id]
  );
  
  // Process payment to worker
  if (task.worker_id) {
    await db.query(
      `UPDATE agents SET balance = balance + $1 WHERE id = $2`,
      [task.price, task.worker_id]
    );
    
    // Record transaction
    await db.query(
      `INSERT INTO transactions (id, task_id, to_agent_id, amount, type) VALUES ($1, $2, $3, $4, 'payment')`,
      [uuidv4(), task.id, task.worker_id, task.price]
    );
  }
  
  res.json({ status: 'completed', result });
});

// ==================== AGENTS ====================

// Register agent
app.post('/api/agents', async (req, res) => {
  const { id, name, type, capabilities } = req.body;
  
  if (!id || !name || !type) {
    return res.status(400).json({ error: 'id, name, type required' });
  }
  
  await db.query(
    `INSERT INTO agents (id, name, type, capabilities) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name = $2, type = $3, capabilities = $4`,
    [id, name, type, JSON.stringify(capabilities || [])]
  );
  
  res.json({ id, name, type, capabilities });
});

// Get agent
app.get('/api/agents/:id', async (req, res) => {
  const agent = await db.get('SELECT * FROM agents WHERE id = $1', [req.params.id]);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  agent.capabilities = JSON.parse(agent.capabilities || '[]');
  res.json(agent);
});

// Get agent balance
app.get('/api/agents/:id/balance', async (req, res) => {
  const agent = await db.get('SELECT balance FROM agents WHERE id = $1', [req.params.id]);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({ balance: agent.balance });
});

// ==================== TRANSACTIONS ====================

// Get transaction history
app.get('/api/agents/:id/transactions', async (req, res) => {
  const { limit = 20 } = req.query;
  
  const transactions = await db.all(
    `SELECT * FROM transactions 
     WHERE from_agent_id = $1 OR to_agent_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [req.params.id, parseInt(limit)]
  );
  
  res.json(transactions);
});

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Confidential Marketplace running on port ${PORT}`);
  });
}

start().catch(console.error);