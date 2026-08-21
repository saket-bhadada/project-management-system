# 📊 Project Management System

A comprehensive project management platform with real-time collaboration features, user authentication, and project tracking capabilities.

## 🌟 Core Concepts

The platform is built around a streamlined workflow connecting project owners with contributors:
1. **Projects (Messages):** Users can post project ideas or job openings. 
2. **Applications:** Other users can discover these projects and submit applications to join them.
3. **Automated Onboarding:** When a project owner accepts an application, the system automatically provisions a dedicated real-time chat room and collaborative workspace for the owner and applicant.
4. **Collaborative Workspaces:** Participants get access to a shared environment where they can chat in real-time, create files, edit code/text, and track file version history.

## ✨ Features

| Feature                             | Description                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| **👥 User Authentication**          | Secure login/registration with local credentials and Google OAuth integration                 |
| **📝 Profile Management**           | Manage user profiles with personalized information, resumes, and user roles                   |
| **🔍 Project Discovery & Search**   | Browse and search for available projects on the central dashboard                             |
| **✅ Application System**           | Apply to projects with custom messages and track application status                           |
| **⚙️ Automated Workflows**          | Accepting an applicant automatically creates a private chat room and project workspace        |
| **💬 Real-Time Chat**               | Instant messaging within project rooms using WebSockets, including presence (online status)   |
| **📁 Collaborative Workspaces**     | Create, edit, and manage project files securely among project participants                    |
| **🕰️ File Versioning & History**    | Track file changes with version history, activity feeds, and change summaries                 |
| **📊 Status Dashboard**             | Monitor project status and track application progress                                         |
| **🎨 Responsive UI**                | Modern, responsive interface built with React, Vite, and Bootstrap                            |

## 🏗️ Architecture

```text
Project Management System
├── client/          (React + Vite Frontend)
│   └── Features: Login, Profile, Dashboard, Applications, Chat, Workspace (File Management)
└── server/          (Express Backend)
    └── Features: Auth (Passport), Real-time WebSocket (Chat & Presence), PostgreSQL DB, REST API
```

### Tech Stack

**Frontend:**

- React 19
- Vite (fast build tool)
- React Router (navigation)
- Bootstrap 5 (styling)
- Socket.io Client (real-time communication)

**Backend:**

- Express.js
- PostgreSQL (database)
- Passport.js (authentication)
- Socket.io (WebSocket support)
- bcrypt (password encryption)

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16+ ([Download](https://nodejs.org))
- **npm** or yarn
- **PostgreSQL** database

### Installation

1. **Clone and navigate to project root:**

```powershell
cd project-management-system
```

2. **Install dependencies:**

```powershell
# Install server dependencies
cd server
npm install

# Install client dependencies (in new terminal)
cd client
npm install
```

### Running the Application

**Option 1: Using Split Terminal (Recommended)**

- Press `Ctrl+`` to open terminal in VS Code
- Click the split icon to create a second terminal

**Terminal 1 - Backend (Node/Express):**

```powershell
cd server
# Create .env file with database credentials (see .env.example)
# DB_PORT=5432, SERVER_PORT=3000
npx nodemon server.js
```

**Terminal 2 - Frontend (React/Vite):**

```powershell
cd client
npm run dev
# Visit http://localhost:5173
```

### Environment Configuration

**Server (.env file in `/server` directory):**

```
SERVER_PORT=3000
DB_PORT=5432
DATABASE_URL=your_postgresql_url
SESSION_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_oauth_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
```

## 📱 Usage Workflow

1. **Register/Login**: Create an account or sign in securely (via Google OAuth or local credentials).
2. **Set up Profile**: Add your resume and configure your user type.
3. **Discover Projects**: Search and browse project postings on the Dashboard.
4. **Apply to Projects**: Submit an application to projects that interest you.
5. **Manage Applicants**: Project owners can review applications and accept/reject them.
6. **Collaborate in Workspaces**: Upon acceptance, jump into the auto-generated project workspace to:
   - **Chat in Real-Time** with team members.
   - **Manage Files**: Create and edit shared project files.
   - **Track Changes**: View activity feeds and file version history.
7. **Check Status**: View current project and application status on the dedicated status page.

## 🛠️ Available Commands

**Client:**

```powershell
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

**Server:**

```powershell
npm run dev      # Start with nodemon (auto-reload)
npm start        # Start production server
npm test         # Run tests
```

## 📂 Project Structure

```
.
├── client/                  # React frontend
│   ├── src/
│   │   ├── main.jsx        # App entry point & routing
│   │   ├── login.jsx       # Login page
│   │   ├── registration.jsx # Registration page
│   │   ├── home.jsx        # Dashboard
│   │   ├── profile.jsx     # User profile
│   │   ├── applications.jsx # Project applications
│   │   ├── chat.jsx        # Chat interface
│   │   ├── status.jsx      # Status page
│   │   └── navbar.jsx      # Navigation
│   └── package.json
│
└── server/                 # Express backend
    ├── server.js           # Main server entry
    ├── index.js            # Express app setup
    ├── db.js               # Database connection
    ├── passport.js         # Authentication config
    ├── home.js             # Home routes
    ├── profile.js          # Profile routes
    ├── chat.js             # Chat routes
    ├── chatws.js           # WebSocket chat
    └── package.json
```

## 🔐 Security

- Passwords encrypted with bcrypt
- Session management with express-session
- CORS enabled for frontend-backend communication
- OAuth 2.0 integration for Google authentication
- HTTP-only cookies for session protection

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add your feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## 📝 Notes

- **Development Only**: MemoryStore is used for sessions; use Redis/PostgreSQL in production
- **HTTPS**: Set `secure: true` in cookie settings when deploying with HTTPS
- **Database**: Ensure PostgreSQL is running before starting the server
- **Port Conflict**: Don't set `PORT` to 5432 (reserved for DB); use `SERVER_PORT` for web server

## 🆘 Troubleshooting

| Issue                      | Solution                                                       |
| -------------------------- | -------------------------------------------------------------- |
| Cannot connect to database | Check PostgreSQL is running and `.env` credentials are correct |
| CORS errors                | Verify `CLIENT_URL` in server matches your frontend URL        |
| WebSocket connection fails | Ensure Server_PORT is open and Socket.io client is configured  |
| Port already in use        | Change `SERVER_PORT` or `PORT` in `.env`                       |

## 📄 License

ISC

---

**Made with ❤️ for project management**

> ⚠️ **Environment variable cheatsheet**
>
> - `SERVER_PORT` – where the HTTP/WebSocket server listens (defaults to `3000`).
>   **avoid using `PORT`**; it’s easy to confuse with the database port.
> - `DB_PORT` – Postgres connection port (default `5432`).
> - `BACKEND_URL` – used by the frontend dev server to proxy `/api` requests.
> - `CLIENT_URL` – passed to CORS middleware, default `http://localhost:5173`.
>
> Make sure you don’t accidentally point the HTTP service at the database port.
> In particular, do **not** set `PORT=5432` when you only meant to configure
> Postgres – use `DB_PORT` instead. The server now treats a `PORT` value as a
> legacy DB port: if it sees `PORT` in your `.env` it will copy it into `DB_PORT`
> and then delete it automatically to keep the web server from starting on the
> wrong port.
