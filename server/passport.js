import express from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import db from "./db.js";


// Temporary DB stub to avoid ReferenceError while DB is not configured.
// Replace with a real DB connection (pg Pool) and proper queries.
// const db = {
//     query: async (..._args) => {
//         // Default: return empty result set
//         return { rows: [] };
//     },
// };

// Create a new router object
const PassportRouter = express.Router();
const SALT_ROUNDS = 10;

// Middleware is already configured in server.js
// PassportRouter.use(session({ ... }));
// PassportRouter.use(passport.initialize());
// PassportRouter.use(passport.session());

// Define a GET route on this router
PassportRouter.get("/",(req,res)=>{
    // Send a single JSON response
    res.json({ message: "hello world" });
});

// Use a custom callback so we can return JSON when the frontend calls via fetch.
PassportRouter.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            // Authentication failed
            return res.status(401).json({ success: false, message: info?.message || 'Invalid credentials', redirect: '/login' });
        }
        // Establish a session and return success + redirect path
        req.login(user, (err) => {
            if (err) return next(err);
            return res.json({ success: true, message: 'Logged in', redirect: '/home' });
        });
    })(req, res, next);
});

PassportRouter.post("/register",async (req,res)=>{
    const email = req.body.email;
    const password = req.body.password;
    // Accept either camelCase `userType` from client or `typeofuser` from elsewhere
    const typeofuser = req.body.userType || req.body.typeofuser || null;
    try{
        const checkresult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (checkresult.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already in use', redirect: '/login' });
        }

        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await db.query(
            'INSERT INTO users (email, password_hash, typeofuser) VALUES ($1, $2, $3) RETURNING id, email, typeofuser',
            [email, hashed, typeofuser]
        );
        const user = result.rows[0];
        // normalize for frontend
        if (user) user.userType = user.typeofuser;
        req.login(user, (err) => {
            if (err) {
                console.error('login after register failed', err);
                return res.status(500).json({ success: false, message: 'Login failed' });
            }
            return res.status(201).json({ success: true, redirect: '/home', user: { id: user.id, email: user.email, userType: user.userType } });
        });
    } catch(err){
        console.error(err);
        return res.status(500).json({ success:false, message: 'Server error' });
    }
});

passport.use(new LocalStrategy({ usernameField: 'email' }, async function verify(email, password, done) {
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return done(null, false, { message: 'User not found' });
        }
        const user = result.rows[0];
        // normalize for frontend
        if (user) user.userType = user.typeofuser;
        const storedHashpassword = user.password_hash;
        const valid = await bcrypt.compare(password, storedHashpassword);
        if (!valid) return done(null, false, { message: 'Invalid password' });
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
    try {
        const result = await db.query('SELECT id, email, typeofuser FROM users WHERE id = $1', [id]);
        const row = result.rows[0] || null;
        if (row) row.userType = row.typeofuser;
        cb(null, row);
    } catch (err) {
        cb(err);
    }
});
// TODO: Add Passport.js strategies (Local, Google) here

// TODO: Add registration and login routes here
// router.post("/register", ...);

// Export the router to be used in other parts of the application
export default PassportRouter;