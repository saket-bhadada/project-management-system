import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
// import path from "path";
// import { fileURLToPath } from "url";
import passport from "passport";
import passportRouter from "./passport.js";
import homeRouter from "./home.js";
import profileRouter from "./profile.js";
import pg from "pg";
import session from "express-session";
import db from "./db.js";

// import { profile } from "console";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(bodyParser.json());
app.use(express.json());

// Configure session middleware. In production, set a strong secret in env and
// use a persistent session store (Redis, PG store, etc.). This MemoryStore
// is fine for local development only.
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // set to true when serving over HTTPS
        sameSite: 'lax',
    },
}));

// const db = new pg.Client({
//     user: "postgres",
//     host: "localhost",
//     database:"PWS",
//     password:"Saket2006",
//     port:5432,
// })
// Initialize passport middleware and enable persistent login sessions
app.use(passport.initialize());
app.use(passport.session());

app.use("/api", passportRouter);
// Mount home routes under /api so client can call /api/home and /api/messages
app.use("/api", homeRouter);
app.use("/api",profileRouter);
app.listen(3000,()=>{
    console.log('listening on port 3000');
})
// connect to database (best effort)
db.connect().catch(err => console.warn('DB connect warning:', err.message || err));