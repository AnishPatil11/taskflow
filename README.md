TaskFlow

A team task board with role-based access. Members manage their own work, admins see everything, and every permission is enforced on the server, not just hidden in the UI.

Show Image Show Image Show Image Show Image Show Image Show Image

Live demo: coming soon

Screenshots
Sign in

Show Image

Task board

Drag cards between To do, In progress and Done.

Show Image

Admin: manage team

Admins can promote or demote users and assign tasks to anyone.

Show Image

Member view

Members only see tasks they created or are assigned to.

Show Image

Features
Authentication: register and sign in with bcrypt-hashed passwords and JWT sessions (7-day expiry).
Role-based access control: two roles, admin and member. The first account registered becomes the admin.
Kanban board: three status columns with drag-and-drop, plus a dropdown on each card as a touch-friendly fallback.
Task assignment: admins assign tasks to any user; members' tasks are assigned to themselves.
Team management: admins promote or demote users from the UI.
Input validation and clear errors: the API returns specific messages, and the UI shows them.
Tech stack
Layer	Technology
Frontend	React 18, TypeScript, Redux Toolkit, Tailwind CSS, Vite
Backend	Node.js, Express
Database	MongoDB with Mongoose
Auth	JSON Web Tokens, bcryptjs
Permissions
Action	Admin	Member
See tasks	All tasks	Tasks they created or are assigned
Create a task	Yes, assign to anyone	Yes, assigned to self
Move a task between columns	Any task	Own or assigned tasks
Delete a task	Any task	Only tasks they created
View and manage users	Yes	No (sees only themselves)
How it works
The client stores the JWT in localStorage and sends it as a Bearer token on every request.
The server's auth middleware verifies the token, then reads the user's role from the database on each request, so a role change takes effect immediately instead of waiting for the token to expire.
Redux Toolkit holds app state. Async thunks call the API, and slices update the board when requests succeed.
Vite proxies /api requests to the Express server during development, so there are no CORS issues locally.
Project structure
taskflow/
├── client/
│   └── src/
│       ├── App.tsx      # Sign-in form and board UI
│       ├── store.ts     # Redux slices, async thunks, typed hooks
│       └── main.tsx
├── server/
│   └── server.js        # Express API, Mongoose models, auth middleware
└── README.md
Getting started

Prerequisites: Node.js 18+ and MongoDB running locally (or a MongoDB Atlas connection string).

bash
# 1. Clone the repository
git clone https://github.com/YOUR-USERNAME/taskflow.git
cd taskflow

# 2. Start the API (terminal 1)
cd server
cp .env.example .env      # on Windows: copy .env.example .env
npm install
npm run dev

# 3. Start the client (terminal 2)
cd client
npm install
npm run dev

Open http://localhost:5173 and register. The first account becomes the admin; register a second account in a private window to see the member view.

Environment variables (server/.env)
Variable	Description	Default
MONGO_URI	MongoDB connection string	mongodb://127.0.0.1:27017/taskflow
JWT_SECRET	Secret used to sign tokens. Use a long random value.	dev-secret-change-me
PORT	API port	5000
CLIENT_URL	Allowed frontend origin (CORS)	http://localhost:5173
API reference

All routes except /api/auth/* require an Authorization: Bearer <token> header.

Method	Endpoint	Access	Description
POST	/api/auth/register	Public	Create an account
POST	/api/auth/login	Public	Sign in and receive a token
GET	/api/users	Any user	Admins get all users, members get themselves
PATCH	/api/users/:id/role	Admin	Change a user's role
GET	/api/tasks	Any user	List tasks visible to the user
POST	/api/tasks	Any user	Create a task
PATCH	/api/tasks/:id	Admin, creator or assignee	Update status, title or assignee
DELETE	/api/tasks/:id	Admin or creator	Delete a task
Roadmap
 Deploy (Vercel + Render + MongoDB Atlas)
 Automated tests and a CI workflow
 Multiple boards, task descriptions and due dates
 Refresh tokens and httpOnly cookie sessions
Author

Anish Patil LinkedIn · GitHub
