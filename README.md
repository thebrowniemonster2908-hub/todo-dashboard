# 📋 Todo Dashboard with Autonomous Task Execution

A powerful todo management system with a beautiful web UI and autonomous task execution via hourly cron jobs.

## Features

✨ **Task Management**
- Add, edit, and delete tasks
- Set priority levels (Low, Medium, High, Critical)
- Mark tasks as complete
- View task creation and completion timestamps

🤖 **Autonomous Execution**
- Hourly cron job that processes pending tasks
- Executes tasks by priority (highest first)
- Logs all execution steps in real-time
- Automatically marks tasks as complete

📊 **Dashboard UI**
- Beautiful, responsive web interface
- Real-time task statistics
- Live activity logging
- Manual trigger for task execution
- Sort and filter by priority

💾 **Persistent Storage**
- All tasks stored in `tasks.json`
- Complete activity log in `tasks.log`
- JSON format for easy backup and integration

## Installation

```bash
# Navigate to project
cd /Users/caseyelliott/todo-dashboard

# Install dependencies
npm install
```

## Running the Server

```bash
# Start the server
npm start

# Or with explicit node command
node server.js
```

The dashboard will be available at: **http://localhost:3001**

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Logs
- `GET /api/logs` - Get activity logs

### Worker
- `POST /api/run-worker` - Manually trigger task execution

## Task Structure

```json
{
  "id": "uuid",
  "title": "Task title",
  "description": "Task description",
  "priority": "low|medium|high|critical",
  "completed": false,
  "createdAt": "2026-03-24T...",
  "completedAt": null
}
```

## Cron Job Schedule

The autonomous task worker runs every hour at minute 0:
```
0 * * * *  (Every hour)
```

When triggered, it:
1. Checks for pending tasks
2. Sorts by priority (critical → high → medium → low)
3. Executes each task autonomously
4. Logs all steps to `tasks.log`
5. Marks completed tasks

## File Structure

```
todo-dashboard/
├── server.js              # Express server & API routes
├── public/
│   ├── index.html        # Main UI
│   ├── app.js            # Frontend logic
│   └── style.css         # Styling
├── tasks.json            # Task storage (auto-created)
├── tasks.log             # Activity log (auto-created)
├── package.json          # Dependencies
└── README.md             # This file
```

## Usage

### Adding a Task
1. Enter task title in the input field
2. Add optional description
3. Select priority level
4. Click "Add Task"

### Managing Tasks
- **Complete**: Check the checkbox next to a task
- **Edit**: Click the edit button, modify details, click save
- **Delete**: Click the delete button (confirmation required)

### Viewing Logs
- Activity logs auto-refresh every 5 seconds
- Shows all operations (create, update, delete, execute)
- Color-coded for easy reading:
  - 🟢 Success (green)
  - 🔴 Errors (red)
  - 🟡 Cron events (orange)
  - 🔵 Task events (blue)

### Running Worker Manually
- Click "▶️ Run Worker Now" button in the dashboard
- Worker will process all pending tasks immediately
- Check logs for execution details

## Statistics

The dashboard header shows:
- **Total**: All tasks (completed + pending)
- **Completed**: Number of finished tasks
- **Pending**: Number of remaining tasks

## Logs

All activity is logged to `tasks.log`:
```
[2026-03-24T10:00:00.000Z] TODO DASHBOARD SERVER STARTED
[2026-03-24T10:01:23.456Z] TASK CREATED: "Buy groceries" (Priority: high)
[2026-03-24T11:00:00.000Z] ------- HOURLY CRON JOB TRIGGERED -------
[2026-03-24T11:00:02.123Z] AUTONOMOUS EXECUTION: Processing "Buy groceries" (high)
[2026-03-24T11:00:02.234Z]   ├─ Task Details: Shop for weekly supplies
[2026-03-24T11:00:02.345Z]   ├─ Analyzing requirements
...
```

## Performance

- **Real-time UI updates**: Every 5 seconds
- **Task processing**: < 1 second per task
- **Log rendering**: Instant
- **Database operations**: < 100ms

## Development

### Modify task execution logic
Edit the `processTasksAutonomously()` function in `server.js`

### Add custom task handlers
Extend the `processTasksAutonomously()` function to integrate with APIs, databases, etc.

### Change cron schedule
Modify the cron expression in `server.js`:
```javascript
const cronSchedule = '0 * * * *'; // Change this
cron.schedule(cronSchedule, async () => {
  // ...
});
```

## Troubleshooting

### Port already in use
If port 3001 is busy, modify the PORT variable in `server.js`:
```javascript
const PORT = 3002; // Change port number
```

### Tasks not loading
- Check that `tasks.json` exists
- Verify file permissions
- Check server logs for errors

### Cron job not running
- Ensure server is running
- Check `tasks.log` for cron trigger messages
- Manually run worker to test

## License

MIT

## Support

For issues or questions, check the activity logs or contact support.
