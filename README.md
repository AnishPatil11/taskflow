# TaskFlow

Team task board. React + TypeScript + Redux Toolkit + Tailwind (client), Node + Express + MongoDB + JWT (server).

## Run it
Needs Node 18+ and MongoDB running locally (or a MongoDB Atlas URI).

```bash
# terminal 1
cd server && cp .env.example .env && npm install && npm run dev

# terminal 2
cd client && npm install && npm run dev
```
Open http://localhost:5173. The first account you register becomes the **admin**.

## Roles
- **Admin:** sees all tasks, assigns tasks to anyone, deletes any task, promotes/demotes users.
- **Member:** creates tasks (assigned to self), sees and moves tasks they created or are assigned, deletes only tasks they created.

## API
POST /api/auth/register, /api/auth/login - GET /api/users - PATCH /api/users/:id/role (admin) - GET/POST /api/tasks - PATCH/DELETE /api/tasks/:id (Bearer JWT required)
