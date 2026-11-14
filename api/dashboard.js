import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
const TASKS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../tasks.json');
const digest = value => createHash('sha256').update(value).digest();
export function validateTask(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 8192) throw new Error('Invalid body');
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) throw new Error('Invalid title');
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 4000)) throw new Error('Invalid description');
  if (!['low', 'medium', 'high', 'critical'].includes(body.priority || 'medium')) throw new Error('Invalid priority');
  return { title:body.title.trim(), description:body.description || '', priority:body.priority || 'medium' };
}
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.DASHBOARD_API_TOKEN;
  if (!key || key.length < 32) return res.status(503).json({ error:'Dashboard access is not configured.' });
  const supplied = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!supplied || supplied.length > 1024 || !timingSafeEqual(digest(supplied), digest(key))) return res.status(401).json({ error:'Unauthorized' });
  if (req.headers.origin && req.headers.origin !== process.env.DASHBOARD_ORIGIN) return res.status(403).json({ error:'Invalid origin' });
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error:'Method not allowed' });
  try {
    const tasks = fs.existsSync(TASKS_FILE) ? JSON.parse(fs.readFileSync(TASKS_FILE,'utf8')) : [];
    if (!Array.isArray(tasks)) throw new Error('Invalid store');
    if (req.method === 'GET') return res.status(200).json(tasks);
    // The filesystem store is local-only. Serverless writes require a durable
    // database and are not enabled by the presence of an API token.
    if (process.env.VERCEL || process.env.TODO_LOCAL_WRITES !== 'true') return res.status(503).json({ error:'Task writes are not configured.' });
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(400).json({ error:'Invalid request' });
    let fields; try { fields = validateTask(req.body); } catch { return res.status(400).json({ error:'Invalid task' }); }
    const task = { id:randomUUID(), ...fields, completed:false, createdAt:new Date().toISOString() };
    tasks.push(task); fs.writeFileSync(TASKS_FILE,JSON.stringify(tasks,null,2),{mode:0o600});
    return res.status(201).json(task);
  } catch { return res.status(503).json({ error:'Dashboard storage is unavailable.' }); }
}
