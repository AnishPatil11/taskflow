import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

export type Role = 'admin' | 'member';
export type Status = 'todo' | 'doing' | 'done';
export interface User { id: string; name: string; email: string; role: Role }
export interface Task {
  _id: string; title: string; description: string; status: Status;
  createdBy: string; assignee: { _id: string; name: string } | null;
}

// Small fetch wrapper: adds the JWT and turns API errors into thrown Errors.
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data as T;
}

export const authenticate = createAsyncThunk(
  'auth/authenticate',
  async (a: { mode: 'login' | 'register'; name?: string; email: string; password: string }) => {
    const r = await call<{ token: string; user: User }>(`/auth/${a.mode}`, 'POST', a);
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(r.user));
    return r.user;
  }
);
export const loadAll = createAsyncThunk('board/load', async () => {
  const [tasks, users] = await Promise.all([call<Task[]>('/tasks'), call<User[]>('/users')]);
  return { tasks, users };
});
export const addTask = createAsyncThunk('board/add', (t: { title: string; assignee?: string }) => call<Task>('/tasks', 'POST', t));
export const updateTask = createAsyncThunk('board/update', ({ id, ...patch }: { id: string; status?: Status; assignee?: string | null }) =>
  call<Task>(`/tasks/${id}`, 'PATCH', patch)
);
export const removeTask = createAsyncThunk('board/remove', async (id: string) => { await call(`/tasks/${id}`, 'DELETE'); return id; });
export const setRole = createAsyncThunk('board/role', ({ id, role }: { id: string; role: Role }) => call<User>(`/users/${id}/role`, 'PATCH', { role }));

const saved = localStorage.getItem('user');
const auth = createSlice({
  name: 'auth',
  initialState: { user: saved ? (JSON.parse(saved) as User) : null, error: '' },
  reducers: { logout(s) { s.user = null; s.error = ''; localStorage.clear(); } },
  extraReducers: (b) => b
    .addCase(authenticate.fulfilled, (s, a) => { s.user = a.payload; s.error = ''; })
    .addCase(authenticate.rejected, (s, a) => { s.error = a.error.message || 'Could not sign in'; }),
});

const board = createSlice({
  name: 'board',
  initialState: { tasks: [] as Task[], users: [] as User[], error: '' },
  reducers: {},
  extraReducers: (b) => b
    .addCase(loadAll.fulfilled, (s, a) => { s.tasks = a.payload.tasks; s.users = a.payload.users; s.error = ''; })
    .addCase(addTask.fulfilled, (s, a) => { s.tasks.unshift(a.payload); })
    .addCase(updateTask.fulfilled, (s, a) => { s.tasks = s.tasks.map((t) => (t._id === a.payload._id ? a.payload : t)); })
    .addCase(removeTask.fulfilled, (s, a) => { s.tasks = s.tasks.filter((t) => t._id !== a.payload); })
    .addCase(setRole.fulfilled, (s, a) => { s.users = s.users.map((u) => (u.id === a.payload.id ? a.payload : u)); })
    .addMatcher(
      (a) => a.type.startsWith('board/') && a.type.endsWith('/rejected'),
      (s, a: { error?: { message?: string } }) => { s.error = a.error?.message || 'Something went wrong'; }
    ),
});

export const { logout } = auth.actions;
export const store = configureStore({ reducer: { auth: auth.reducer, board: board.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
