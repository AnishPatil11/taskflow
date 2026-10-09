import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { MONGO_URI = 'mongodb://127.0.0.1:27017/taskflow', JWT_SECRET = 'dev-secret-change-me', PORT = 5000, CLIENT_URL = 'http://localhost:5173' } = process.env;

const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
}, { timestamps: true }));

const Task = mongoose.model('Task', new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['todo', 'doing', 'done'], default: 'todo' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true }));

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const sign = (u) => jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(500).json({ error: e.message }));

// Auth middleware: verifies the JWT, then reads the role from the DB so role changes apply immediately.
const auth = async (req, res, next) => {
  try {
    const { id } = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET);
    const u = await User.findById(id);
    if (!u) throw new Error('no user');
    req.user = { id: String(u._id), role: u.role };
    next();
  } catch { res.status(401).json({ error: 'Please sign in again' }); }
};
const adminOnly = (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only' }));
const canTouch = (t, u) => u.role === 'admin' || String(t.createdBy) === u.id || String(t.assignee) === u.id;

// ---- Auth ----
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Name, email and a password of 6+ characters are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'That email is already registered' });
  const role = (await User.countDocuments()) === 0 ? 'admin' : 'member'; // first account becomes admin
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ error: 'Email or password is incorrect' });
  res.json({ token: sign(user), user: publicUser(user) });
}));

// ---- Users (admins see everyone, members only themselves) ----
app.get('/api/users', auth, wrap(async (req, res) => {
  const users = await User.find(req.user.role === 'admin' ? {} : { _id: req.user.id });
  res.json(users.map(publicUser));
}));

app.patch('/api/users/:id/role', auth, adminOnly, wrap(async (req, res) => {
  if (!['admin', 'member'].includes(req.body.role)) return res.status(400).json({ error: 'Invalid role' });
  const u = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(publicUser(u));
}));

// ---- Tasks ----
app.get('/api/tasks', auth, wrap(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { $or: [{ createdBy: req.user.id }, { assignee: req.user.id }] };
  res.json(await Task.find(filter).sort('-createdAt').populate('assignee', 'name'));
}));

app.post('/api/tasks', auth, wrap(async (req, res) => {
  const { title, description, assignee } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'A task needs a title' });
  const t = await Task.create({ title, description, createdBy: req.user.id, assignee: req.user.role === 'admin' && assignee ? assignee : req.user.id });
  res.status(201).json(await t.populate('assignee', 'name'));
}));

app.patch('/api/tasks/:id', auth, wrap(async (req, res) => {
  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  if (!canTouch(t, req.user)) return res.status(403).json({ error: 'You can only change your own tasks' });
  const { title, description, status, assignee } = req.body;
  if (title !== undefined) t.title = title;
  if (description !== undefined) t.description = description;
  if (['todo', 'doing', 'done'].includes(status)) t.status = status;
  if (req.user.role === 'admin' && assignee !== undefined) t.assignee = assignee || null;
  await t.save();
  res.json(await t.populate('assignee', 'name'));
}));

app.delete('/api/tasks/:id', auth, wrap(async (req, res) => {
  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role !== 'admin' && String(t.createdBy) !== req.user.id) return res.status(403).json({ error: 'Only the creator or an admin can delete a task' });
  await t.deleteOne();
  res.json({ ok: true });
}));

mongoose.connect(MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`TaskFlow API running on http://localhost:${PORT}`)))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
