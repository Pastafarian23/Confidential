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

  const task = {
    id: uuidv4(),
    title,
    description,
    category,
    price,
    status: 'open',
    requester_id: requester_id || 'anonymous',
    worker_id: null,
    result: null,
    created_at: new Date().toISOString(),
    completed_at: null
  };
  
  db.saveTask(task);
  res.json(task);
});

// List tasks
app.get('/api/tasks', (req, res) => {
  const { status, category, limit = 50 } = req.query;
  const tasks = db.getTasks({ status, category });
  res.json(tasks.slice(0, parseInt(limit)));
});

// Get single task
app.get('/api/tasks/:id', (req, res) => {
  const task = db.getTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// Accept a task
app.post('/api/tasks/:id/accept', (req, res) => {
  const { worker_id } = req.body;
  
  if (!worker_id) {
    return res.status(400).json({ error: 'worker_id required' });
  }
  
  const task = db.getTask(req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task.status !== 'open') {
    return res.status(400).json({ error: 'Task is not available' });
  }
  
  task.status = 'in_progress';
  task.worker_id = worker_id;
  db.saveTask(task);
  
  res.json({ status: 'in_progress', worker_id });
});

// Submit task result
app.post('/api/tasks/:id/submit', (req, res) => {
  const { result } = req.body;
  
  if (!result) {
    return res.status(400).json({ error: 'result required' });
  }
  
  const task = db.getTask(req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task.status !== 'in_progress') {
    return res.status(400).json({ error: 'Task is not in progress' });
  }
  
  task.result = result;
  task.status = 'completed';
  task.completed_at = new Date().toISOString();
  db.saveTask(task);
  
  // Process payment
  if (task.worker_id) {
    const worker = db.getAgent(task.worker_id);
    if (worker) {
      worker.balance = (worker.balance || 0) + task.price;
      db.saveAgent(worker);
      
      // Record transaction
      db.addTransaction({
        id: uuidv4(),
        task_id: task.id,
        from_agent_id: task.requester_id,
        to_agent_id: task.worker_id,
        amount: task.price,
        type: 'payment',
        created_at: new Date().toISOString()
      });
    }
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
  
  const existing = db.getAgent(id);
  const agent = {
    id,
    name,
    type,
    capabilities: capabilities || [],
    balance: existing?.balance || 0,
    created_at: existing?.created_at || new Date().toISOString()
  };
  
  db.saveAgent(agent);
  res.json(agent);
});

// Get agent
app.get('/api/agents/:id', (req, res) => {
  const agent = db.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

// Get agent balance
app.get('/api/agents/:id/balance', (req, res) => {
  const agent = db.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json({ balance: agent.balance || 0 });
});

// Get agent transactions
app.get('/api/agents/:id/transactions', (req, res) => {
  const { limit = 20 } = req.query;
  const transactions = db.getTransactions(req.params.id);
  res.json(transactions.slice(0, parseInt(limit)));
});

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Confidential Marketplace running on port ${PORT}`);
});