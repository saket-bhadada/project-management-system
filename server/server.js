import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";
import passportRouter from "./passport.js";
import homeRouter from "./home.js";
import profileRouter from "./profile.js";
// import pg from "pg";
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

// Initialize passport middleware (no session store configured here)
app.use(passport.initialize());

app.use("/api", passportRouter);
// Mount home routes under /api so client can call /api/home and /api/messages
app.use("/api", homeRouter);
app.use("/api",profileRouter);
app.listen(3000,()=>{
    console.log('listening on port 3000');
})