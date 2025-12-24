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
npm run dev
```

In the other terminal (nodemon):

```powershell
cd server
npx nodemon server.js
```
