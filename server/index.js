import express from "express";
import { createServer } from "http";
import cors from "cors";
import bodyParser from "body-parser";
// import path from "path";
// import { fileURLToPath } from "url";
import passport from "passport";
import passportRouter from "./passport.js";
import homeRouter from "./home.js";
import profileRouter from "./profile.js";
import { setupChat } from "./chatws.js";
import { chatRouter } from "./chat.js";
// import pg from "pg";
import session from "express-session";
// import db from "./db.js";
// import url from "url";


// import { profile } from "console";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// allow the client to be served from a configurable URL (default is the dev port)
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({
    origin: CLIENT_URL,
    credentials: true,
}));
app.use(bodyParser.json());
app.use(express.json());

// Configure session middleware. In production, set a strong secret in env and
// use a persistent session store (Redis, PG store, etc.). This MemoryStore
// is fine for local development only.
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';
const sessionMiddleware = session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // set to true when serving over HTTPS
        sameSite: 'lax',
    },
});

app.use(sessionMiddleware);

// Initialize passport middleware and enable persistent login sessions
app.use(passport.initialize());
app.use(passport.session());

// passportRouter defines `/login` and `/register` itself, so mount it
// at `/api` rather than `/api/login` (otherwise endpoints become
// `/api/login/login` and never match client requests).
app.use("/api", passportRouter);
app.use("/api", homeRouter);
app.use("/api",profileRouter);
// app.use("/api", chatRouter);
app.use("/api/chat", chatRouter);

// Initialize WebSocket for chat
setupChat(server, sessionMiddleware);

// the HTTP server is started elsewhere (see server.js); this module only
// configures and exports `app` and `server` for reuse.
export {app,server};