const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;

// ==================== TASKS ====================

// Create a new task
app.post('/api/tasks', (req, res) => {
  const { title, description, category, price, requester_id } = req.body;
  
  if (!title || !description || !category || !price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, description, category, price, requester_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, title, description, category, price, requester_id || 'anonymous');
  
  res.json({ id, title, description, category, price, status: 'open' });
});

// List tasks (filter by status)
app.get('/api/tasks', (req, res) => {
  const { status, category, limit = 50 } = req.query;
  
  let query = 'SELECT * FROM tasks';
  const params = [];
  const conditions = [];
  
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const stmt = db.prepare(query);
  const tasks = stmt.all(...params);
  
  res.json(tasks);
});

// Get single task
app.get('/api/tasks/:id', (req, res) => {
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const task = stmt.get(req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  res.json(task);
});

// Accept a task (worker claims it)
app.post('/api/tasks/:id/accept', (req, res) => {
  const { worker_id } = req.body;
  
  if (!worker_id) {
    return res.status(400).json({ error: 'worker_id required' });
  }
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task.status !== 'open') {
    return res.status(400).json({ error: 'Task is not available' });
  }
  
  db.prepare(`
    UPDATE tasks SET status = 'in_progress', worker_id = ? WHERE id = ?
  `).run(worker_id, req.params.id);
  
  res.json({ status: 'in_progress', worker_id });
});

// Submit task result
app.post('/api/tasks/:id/submit', (req, res) => {
  const { result } = req.body;
  
  if (!result) {
    return res.status(400).json({ error: 'result required' });
  }
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task.status !== 'in_progress') {
    return res.status(400).json({ error: 'Task is not in progress' });
  }
  
  db.prepare(`
    UPDATE tasks SET result = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(result, req.params.id);
  
  // Process payment to worker
  if (task.worker_id) {
    db.prepare(`
      UPDATE agents SET balance = balance + ? WHERE id = ?
    `).run(task.price, task.worker_id);
    
    // Record transaction
    db.prepare(`
      INSERT INTO transactions (id, task_id, to_agent_id, amount, type)
      VALUES (?, ?, ?, ?, 'payment')
    `).run(uuidv4(), task.id, task.worker_id, task.price);
  }
  
  res.json({ status: 'completed', result });
});

// ==================== AGENTS ====================

// Register agent
app.post('/api/agents', (req, res) => {
  const { id, name, type, capabilities } = req.body;
  
  if (!id || !name || !type) {
    return res.status(400).json({ error: 'id, name, type required' });
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO agents (id, name, type, capabilities)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(id, name, type, JSON.stringify(capabilities || []));
  
  res.json({ id, name, type, capabilities });
});

// Get agent
app.get('/api/agents/:id', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  agent.capabilities = JSON.parse(agent.capabilities || '[]');
  res.json(agent);
});

// Get agent balance
app.get('/api/agents/:id/balance', (req, res) => {
  const agent = db.prepare('SELECT balance FROM agents WHERE id = ?').get(req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({ balance: agent.balance });
});

// ==================== TRANSACTIONS ====================

// Get transaction history
app.get('/api/agents/:id/transactions', (req, res) => {
  const { limit = 20 } = req.query;
  
  const transactions = db.prepare(`
    SELECT * FROM transactions 
    WHERE from_agent_id = ? OR to_agent_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(req.params.id, req.params.id, parseInt(limit));
  
  res.json(transactions);
});

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Confidential Marketplace running on port ${PORT}`);
});