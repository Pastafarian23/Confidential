const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'marketplace.json');

// In-memory store
let data = {
  agents: [],
  tasks: [],
  transactions: []
};

// Load from file if exists
function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading DB:', err.message);
  }
}

// Save to file
function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure initialized
load();

// Helper functions
const db = {
  // Agents
  getAgent: (id) => data.agents.find(a => a.id === id),
  
  saveAgent: (agent) => {
    const idx = data.agents.findIndex(a => a.id === agent.id);
    if (idx >= 0) {
      data.agents[idx] = { ...data.agents[idx], ...agent };
    } else {
      data.agents.push(agent);
    }
    save();
  },
  
  // Tasks
  getTasks: (filter = {}) => {
    let tasks = data.tasks;
    if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
    if (filter.category) tasks = tasks.filter(t => t.category === filter.category);
    return tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  
  getTask: (id) => data.tasks.find(t => t.id === id),
  
  saveTask: (task) => {
    const idx = data.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      data.tasks[idx] = { ...data.tasks[idx], ...task };
    } else {
      data.tasks.push(task);
    }
    save();
  },
  
  // Transactions
  addTransaction: (tx) => {
    data.transactions.push(tx);
    save();
  },
  
  getTransactions: (agentId) => {
    return data.transactions
      .filter(t => t.from_agent_id === agentId || t.to_agent_id === agentId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};

module.exports = db;