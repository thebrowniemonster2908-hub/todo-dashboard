import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const TASKS_FILE = path.join(__dirname, '../tasks.json');
const LOGS_FILE = path.join(__dirname, '../tasks.log');

function loadTasks() {
  if (!fs.existsSync(TASKS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function logActivity(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOGS_FILE, logMessage);
}

// API Routes
app.get('/api/tasks', (req, res) => {
  const tasks = loadTasks();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, priority } = req.body;
  const tasks = loadTasks();
  const newTask = {
    id: Date.now().toString(),
    title,
    description,
    priority: priority || 'medium',
    completed: false,
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  saveTasks(tasks);
  logActivity(`Task created: ${title}`);
  res.json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, priority, completed } = req.body;
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id);
  if (task) {
    if (title) task.title = title;
    if (description) task.description = description;
    if (priority) task.priority = priority;
    if (completed !== undefined) task.completed = completed;
    saveTasks(tasks);
    logActivity(`Task updated: ${id}`);
  }
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  let tasks = loadTasks();
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);
  logActivity(`Task deleted: ${id}`);
  res.json({ success: true });
});

// Frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

export default app;
