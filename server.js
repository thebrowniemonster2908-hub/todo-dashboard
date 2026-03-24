const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// File paths
const tasksFile = path.join(__dirname, 'tasks.json');
const logsFile = path.join(__dirname, 'tasks.log');

// Initialize files if they don't exist
if (!fs.existsSync(tasksFile)) {
  fs.writeFileSync(tasksFile, JSON.stringify([], null, 2));
}

if (!fs.existsSync(logsFile)) {
  fs.writeFileSync(logsFile, '');
}

// Logging function
function logActivity(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logsFile, logEntry);
  console.log(logEntry.trim());
}

// Load tasks from JSON
function loadTasks() {
  try {
    const data = fs.readFileSync(tasksFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    logActivity(`ERROR: Failed to load tasks: ${err.message}`);
    return [];
  }
}

// Save tasks to JSON
function saveTasks(tasks) {
  try {
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
  } catch (err) {
    logActivity(`ERROR: Failed to save tasks: ${err.message}`);
  }
}

// Priority levels
const PRIORITY_LEVELS = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

// ============= API ENDPOINTS =============

// GET all tasks
app.get('/api/tasks', (req, res) => {
  const tasks = loadTasks();
  res.json(tasks);
});

// POST - Create new task
app.post('/api/tasks', (req, res) => {
  const { title, description, priority } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const tasks = loadTasks();
  const newTask = {
    id: uuidv4(),
    title,
    description: description || '',
    priority: priority || 'medium',
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.push(newTask);
  saveTasks(tasks);
  logActivity(`TASK CREATED: "${title}" (Priority: ${priority || 'medium'})`);

  res.status(201).json(newTask);
});

// PUT - Update task
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, priority, completed } = req.body;

  const tasks = loadTasks();
  const taskIndex = tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const oldTask = tasks[taskIndex];
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...(title && { title }),
    ...(description !== undefined && { description }),
    ...(priority && { priority }),
    ...(completed !== undefined && {
      completed,
      completedAt: completed ? new Date().toISOString() : null
    })
  };

  saveTasks(tasks);

  const changes = [];
  if (title && title !== oldTask.title) changes.push(`title="${title}"`);
  if (priority && priority !== oldTask.priority) changes.push(`priority="${priority}"`);
  if (completed !== undefined && completed !== oldTask.completed) {
    changes.push(`completed=${completed}`);
  }

  if (changes.length > 0) {
    logActivity(`TASK UPDATED: "${oldTask.title}" [${changes.join(', ')}]`);
  }

  res.json(tasks[taskIndex]);
});

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  const tasks = loadTasks();
  const taskIndex = tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const deletedTask = tasks[taskIndex];
  tasks.splice(taskIndex, 1);
  saveTasks(tasks);

  logActivity(`TASK DELETED: "${deletedTask.title}"`);

  res.status(204).send();
});

// GET logs
app.get('/api/logs', (req, res) => {
  try {
    const logs = fs.readFileSync(logsFile, 'utf8');
    res.json({ logs });
  } catch (err) {
    res.json({ logs: '' });
  }
});

// ============= AUTONOMOUS TASK WORKER =============

async function processTasksAutonomously() {
  const tasks = loadTasks();
  const incompleteTasks = tasks.filter(t => !t.completed);

  if (incompleteTasks.length === 0) {
    logActivity('CRON CHECK: No pending tasks');
    return;
  }

  logActivity(`CRON EXECUTION: Starting - ${incompleteTasks.length} pending task(s)`);

  // Sort by priority (highest first)
  const sortedTasks = incompleteTasks.sort((a, b) => {
    return (PRIORITY_LEVELS[b.priority] || 0) - (PRIORITY_LEVELS[a.priority] || 0);
  });

  // Process each task autonomously
  for (const task of sortedTasks) {
    logActivity(`AUTONOMOUS EXECUTION: Processing "${task.title}" (${task.priority})`);

    // Simulate task execution (in real app, this could be API calls, data processing, etc.)
    try {
      // Get detailed task info
      const taskDescription = task.description || 'No description';
      logActivity(`  ├─ Task Details: ${taskDescription}`);

      // Simulate work being done
      const workItems = [
        'Analyzing requirements',
        'Executing task steps',
        'Validating completion',
        'Generating summary'
      ];

      for (const step of workItems) {
        logActivity(`  ├─ ${step}`);
        // Simulate some work time
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Mark task as complete
      const updatedTasks = loadTasks();
      const taskToUpdate = updatedTasks.find(t => t.id === task.id);
      if (taskToUpdate) {
        taskToUpdate.completed = true;
        taskToUpdate.completedAt = new Date().toISOString();
        saveTasks(updatedTasks);
        logActivity(`  └─ ✅ COMPLETED: "${task.title}"`);
      }
    } catch (err) {
      logActivity(`  └─ ❌ ERROR: Failed to process "${task.title}": ${err.message}`);
    }
  }

  logActivity(`CRON EXECUTION: Finished - Processed ${sortedTasks.length} task(s)`);
}

// ============= CRON JOB =============

// Run every hour at minute 0
const cronSchedule = '0 * * * *'; // Every hour
cron.schedule(cronSchedule, async () => {
  logActivity('------- HOURLY CRON JOB TRIGGERED -------');
  await processTasksAutonomously();
  logActivity('------- HOURLY CRON JOB COMPLETE -------');
});

// Also allow manual trigger
app.post('/api/run-worker', async (req, res) => {
  logActivity('------- MANUAL TASK EXECUTION TRIGGERED -------');
  await processTasksAutonomously();
  logActivity('------- MANUAL TASK EXECUTION COMPLETE -------');
  res.json({ message: 'Task worker executed' });
});

// ============= SERVER START =============

app.listen(PORT, () => {
  logActivity(`========================================`);
  logActivity(`TODO DASHBOARD SERVER STARTED`);
  logActivity(`Port: ${PORT}`);
  logActivity(`URL: http://localhost:${PORT}`);
  logActivity(`Cron Schedule: Every hour (0 * * * *)`);
  logActivity(`========================================`);
});
