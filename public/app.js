// API Base URL
const API_BASE = 'http://localhost:3001/api';

// DOM Elements
const taskForm = document.getElementById('addTaskForm');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const taskPriority = document.getElementById('taskPriority');
const tasksList = document.getElementById('tasksList');
const emptyState = document.getElementById('emptyState');
const logsList = document.getElementById('logsList');
const totalCount = document.getElementById('totalCount');
const completedCount = document.getElementById('completedCount');
const pendingCount = document.getElementById('pendingCount');
const runWorkerBtn = document.getElementById('runWorkerBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');

// State
let tasks = [];
let editingId = null;

// ============= EVENT LISTENERS =============

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await addTask();
});

runWorkerBtn.addEventListener('click', async () => {
  runWorkerBtn.disabled = true;
  runWorkerBtn.textContent = '⏳ Running...';
  try {
    await fetch(`${API_BASE}/run-worker`, { method: 'POST' });
    await refreshLogs();
    await loadTasks();
  } catch (err) {
    console.error('Error running worker:', err);
  } finally {
    runWorkerBtn.disabled = false;
    runWorkerBtn.textContent = '▶️ Run Worker Now';
  }
});

clearLogsBtn.addEventListener('click', async () => {
  if (confirm('Clear all logs?')) {
    try {
      // Since we can't clear logs via API, we'll just refresh
      await refreshLogs();
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  }
});

// ============= API FUNCTIONS =============

async function addTask() {
  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();
  const priority = taskPriority.value;

  if (!title) {
    alert('Please enter a task title');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, priority })
    });

    if (!response.ok) throw new Error('Failed to add task');

    taskTitle.value = '';
    taskDescription.value = '';
    taskPriority.value = 'medium';

    await loadTasks();
    await refreshLogs();
  } catch (err) {
    alert('Error adding task: ' + err.message);
  }
}

async function loadTasks() {
  try {
    const response = await fetch(`${API_BASE}/tasks`);
    if (!response.ok) throw new Error('Failed to load tasks');

    tasks = await response.json();
    renderTasks();
    updateStats();
  } catch (err) {
    console.error('Error loading tasks:', err);
  }
}

async function updateTask(id, updates) {
  try {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Failed to update task');

    editingId = null;
    await loadTasks();
    await refreshLogs();
  } catch (err) {
    alert('Error updating task: ' + err.message);
  }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;

  try {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete task');

    await loadTasks();
    await refreshLogs();
  } catch (err) {
    alert('Error deleting task: ' + err.message);
  }
}

async function refreshLogs() {
  try {
    const response = await fetch(`${API_BASE}/logs`);
    if (!response.ok) throw new Error('Failed to load logs');

    const data = await response.json();
    renderLogs(data.logs);
  } catch (err) {
    console.error('Error loading logs:', err);
  }
}

// ============= RENDERING FUNCTIONS =============

function renderTasks() {
  tasksList.innerHTML = '';

  if (tasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  // Sort by priority (highest first), then by creation date
  const priorityLevels = { critical: 4, high: 3, medium: 2, low: 1 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityDiff = (priorityLevels[b.priority] || 0) - (priorityLevels[a.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  sortedTasks.forEach(task => {
    const card = createTaskCard(task);
    tasksList.appendChild(card);
  });
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card ${task.completed ? 'completed' : ''} ${editingId === task.id ? 'editing' : ''}`;

  const createdDate = new Date(task.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const priorityEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
    critical: '⚫'
  }[task.priority] || '🟡';

  const completedAtText = task.completedAt ?
    `Completed: ${new Date(task.completedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}` : '';

  card.innerHTML = `
    <div class="view-mode">
      <div class="task-header">
        <input
          type="checkbox"
          class="task-checkbox"
          ${task.completed ? 'checked' : ''}
          onchange="toggleTaskCompletion('${task.id}', this.checked)"
        />
        <div class="task-info">
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
          <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">
              ${priorityEmoji} ${capitalizeFirst(task.priority)}
            </span>
            <span class="task-date">Created: ${createdDate}</span>
            ${completedAtText ? `<span class="task-date">${completedAtText}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-edit" onclick="startEditing('${task.id}')">✏️ Edit</button>
        <button class="btn btn-danger" onclick="deleteTask('${task.id}')">🗑️ Delete</button>
      </div>
    </div>

    <div class="edit-mode">
      <div class="edit-form">
        <input
          type="text"
          class="edit-title"
          value="${escapeHtml(task.title)}"
          placeholder="Task title..."
        />
        <textarea
          class="edit-description"
          placeholder="Task description..."
          rows="3"
        >${escapeHtml(task.description)}</textarea>
        <div class="edit-form-row">
          <select class="edit-priority">
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🔴 High</option>
            <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>⚫ Critical</option>
          </select>
        </div>
        <div class="edit-form-actions">
          <button class="btn btn-success" onclick="saveEdit('${task.id}')">✅ Save</button>
          <button class="btn btn-secondary" onclick="cancelEdit()">❌ Cancel</button>
        </div>
      </div>
    </div>
  `;

  return card;
}

function renderLogs(logsText) {
  logsList.innerHTML = '';

  if (!logsText.trim()) {
    logsList.innerHTML = '<div class="log-entry">No activity logged yet...</div>';
    return;
  }

  const logLines = logsText.trim().split('\n').reverse();

  logLines.forEach(line => {
    if (!line.trim()) return;

    const entry = document.createElement('div');
    entry.className = 'log-entry';

    // Color code different types of log entries
    if (line.includes('ERROR')) {
      entry.className += ' log-error';
    } else if (line.includes('CRON') || line.includes('AUTONOMOUS')) {
      entry.className += ' log-cron';
    } else if (line.includes('COMPLETED') || line.includes('CREATED')) {
      entry.className += ' log-task';
    } else if (line.includes('SUCCESS')) {
      entry.className += ' log-success';
    }

    // Parse and format the timestamp
    const timestampMatch = line.match(/\[(.*?)\]/);
    let content = line;

    if (timestampMatch) {
      const timestamp = new Date(timestampMatch[1]);
      const timeStr = timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const messageStart = line.indexOf(']') + 2;
      const message = line.substring(messageStart);
      content = `<span class="log-timestamp">[${timeStr}]</span> ${escapeHtml(message)}`;
    }

    entry.innerHTML = content;
    logsList.appendChild(entry);
  });

  // Auto-scroll to latest
  logsList.scrollTop = 0;
}

// ============= HELPER FUNCTIONS =============

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  totalCount.textContent = total;
  completedCount.textContent = completed;
  pendingCount.textContent = pending;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function startEditing(id) {
  editingId = id;
  renderTasks();

  // Focus on the title input
  const card = document.querySelector(`[data-task-id="${id}"]`) || tasksList.querySelector('.task-card.editing');
  if (card) {
    const titleInput = card.querySelector('.edit-title');
    if (titleInput) titleInput.focus();
  }
}

function cancelEdit() {
  editingId = null;
  renderTasks();
}

async function saveEdit(id) {
  const card = tasksList.querySelector('.task-card.editing');
  if (!card) return;

  const title = card.querySelector('.edit-title').value.trim();
  const description = card.querySelector('.edit-description').value.trim();
  const priority = card.querySelector('.edit-priority').value;

  if (!title) {
    alert('Task title cannot be empty');
    return;
  }

  await updateTask(id, { title, description, priority });
}

async function toggleTaskCompletion(id, completed) {
  await updateTask(id, { completed });
}

// ============= INITIALIZATION =============

// Load tasks and logs on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadTasks();
  await refreshLogs();

  // Refresh logs every 5 seconds
  setInterval(refreshLogs, 5000);
});
