# Project Management System

This repository contains a simple Project Management System with a React frontend (`client`) and an Express backend (`server`).

## Prerequisites

- Node.js (v16+ recommended)
- npm (or yarn)
- PostgreSQL (if you use the server's `pg` dependency)

## Setup

1. Open a terminal in the project root.

2. Install server dependencies:

```powershell
cd server
npm install
```

3. Install client dependencies:

Split terminal

- Open the integrated terminal in VS Code: press Ctrl+`.
- Split the terminal: click the split icon in the terminal pane or run `Terminal: Split Terminal` from the Command Palette.

In one terminal (React):

```powershell
cd client
# you can override the dev port, backend proxy, etc. by setting env vars
# e.g. $env:PORT=5174; $env:BACKEND_URL=http://localhost:4000; npm run dev
npm run dev
```

In the other terminal (nodemon):

```powershell
cd server
# create a `.env` (see `.env.example`) to supply your database credentials,
# server port, and other settings.  **Do not set `PORT` to 5432** – use
# `DB_PORT` for the database and `SERVER_PORT` for the web server.
#
# the HTTP/WebSocket server will use SERVER_PORT (default 3000);
# the database client uses DB_PORT (default 5432).
npx nodemon server.js
```

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
