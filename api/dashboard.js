import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASKS_FILE = path.join(__dirname, '../tasks.json');

function loadTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
    }
  } catch {
    return [];
  }
  return [];
}

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'GET') {
    const tasks = loadTasks();
    res.status(200).json(tasks);
  } else if (req.method === 'POST') {
    const tasks = loadTasks();
    const { title, description, priority } = req.body;
    const newTask = {
      id: Date.now().toString(),
      title,
      description,
      priority: priority || 'medium',
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
    res.status(201).json(newTask);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
