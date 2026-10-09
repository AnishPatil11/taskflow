import { FormEvent, useEffect, useState } from 'react';
import { addTask, authenticate, loadAll, logout, removeTask, setRole, Status, updateTask, useAppDispatch, useAppSelector } from './store';

const COLUMNS: { key: Status; label: string; bar: string }[] = [
  { key: 'todo', label: 'To do', bar: 'border-slate-400' },
  { key: 'doing', label: 'In progress', bar: 'border-amber-500' },
  { key: 'done', label: 'Done', bar: 'border-teal-600' },
];
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20';
const primary = 'rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700';

function AuthForm() {
  const dispatch = useAppDispatch();
  const error = useAppSelector((s) => s.auth.error);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const submit = (e: FormEvent) => { e.preventDefault(); dispatch(authenticate({ mode, ...f })); };
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-teal-800">TaskFlow</h1>
        <p className="text-sm text-slate-500">{mode === 'login' ? 'Sign in to see your board.' : 'Create an account. The first account becomes the admin.'}</p>
        {mode === 'register' && <input className={field} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />}
        <input className={field} type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input className={field} type="password" placeholder="Password (6+ characters)" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button className={`${primary} w-full`}>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="w-full text-sm text-teal-800 underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </button>
      </form>
    </main>
  );
}

function Board() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user)!;
  const { tasks, users, error } = useAppSelector((s) => s.board);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [team, setTeam] = useState(false);
  const isAdmin = user.role === 'admin';

  useEffect(() => { dispatch(loadAll()); }, [dispatch]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    dispatch(addTask({ title, assignee: assignee || undefined }));
    setTitle('');
  };

  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-teal-800">TaskFlow</h1>
        <div className="flex items-center gap-2 text-sm">
          <span>{user.name} <span className="rounded bg-slate-200 px-2 py-0.5">{user.role}</span></span>
          {isAdmin && <button className="rounded border border-slate-300 bg-white px-3 py-1" onClick={() => setTeam(!team)}>{team ? 'Hide team' : 'Manage team'}</button>}
          <button className="rounded border border-slate-300 bg-white px-3 py-1" onClick={() => dispatch(logout())}>Sign out</button>
        </div>
      </header>

      {error && <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {team && (
        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Team</h2>
          <ul className="divide-y divide-slate-100">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                <span>{u.name} <span className="text-slate-500">{u.email}</span></span>
                <button className="rounded border border-slate-300 px-3 py-1" onClick={() => dispatch(setRole({ id: u.id, role: u.role === 'admin' ? 'member' : 'admin' }))}>
                  {u.role === 'admin' ? 'Make member' : 'Make admin'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={add} className="mb-4 flex flex-wrap gap-2">
        <input className={`${field} flex-1`} placeholder="Add a task" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Task title" />
        {isAdmin && (
          <select className={`${field} sm:w-48`} value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assign to">
            <option value="">Assign to me</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <button className={primary}>Add task</button>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.key);
          return (
            <section key={col.key} className={`min-h-40 rounded-xl border-t-4 bg-slate-200/60 p-3 ${col.bar}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) dispatch(updateTask({ id: dragId, status: col.key })); setDragId(null); }}>
              <h2 className="mb-2 font-semibold">{col.label} <span className="text-slate-500">({items.length})</span></h2>
              {items.length === 0 && <p className="text-sm text-slate-500">Drop a task here.</p>}
              <ul className="space-y-2">
                {items.map((t) => (
                  <li key={t._id} draggable onDragStart={() => setDragId(t._id)} className="cursor-grab rounded-lg border border-slate-200 bg-white p-3">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.assignee ? `Assigned to ${t.assignee.name}` : 'Unassigned'}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <select className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs" value={t.status} aria-label="Move task"
                        onChange={(e) => dispatch(updateTask({ id: t._id, status: e.target.value as Status }))}>
                        {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                      {(isAdmin || t.createdBy === user.id) && (
                        <button className="text-xs text-red-700 underline" onClick={() => dispatch(removeTask(t._id))}>Delete</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  return useAppSelector((s) => s.auth.user) ? <Board /> : <AuthForm />;
}
