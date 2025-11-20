import express from "express";
import passport from "passport";
// import pg from "pg";
import bcrypt, { hash } from "bcrypt";
import { Strategy as LocalStrategy, Strategy } from "passport-local";

// Temporary DB stub to avoid ReferenceError while DB is not configured.
// Replace with a real DB connection (pg Pool) and proper queries.
const db = {
    query: async (..._args) => {
        // Default: return empty result set
        return { rows: [] };
    },
};

// Create a new router object
const PassportRouter = express.Router();
const saltround = 10;

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
    const typeuser = req.body.userType;
    try{
        const checkresult = await db.query();
        if(checkresult.rows.length > 0){
            return res.json({redirect:"/login"});
        }else{
            bcrypt.hash(password,saltround,async(err,hash)=>{
                if(err){
                    console.error("error hashing the password", err);
                }else{
                    const result = await db.query();
                    const user = result.rows[0];
                    req.login(user,(err)=>{
                        console.log("success");
                        return res.json({ success: true, redirect: "/home" });
                    });
                }
            });
        }
    }catch(err){
        console.error(err);
        return res.status(500).json({ success:false, message: 'Server error' });
    }
});
// PassportRouter.post("/login",(req,res)=>{
//     const {email,password}=req.body;
//     console.log(email,password);
//     res.json({ message: "User logged in successfully!" });
//     try{

//     }catch(err){
//         console.error(err);
//         res.status(500).json({ message: "Internal server error" });
//     }
// });

passport.use(
    "local",
    new Strategy(async function verify(username,password,cb){
        try{
            const result = await db.query();
            if(result.rows.length > 0){
                const user = result.rows[0];
                const storedHashpassword = user.password;
                bcrypt.compare(password,storedHashpassword,(err,valid)=>{
                    if(err){
                        console.error("error comparing password ",err);
                        return cb(err);
                    }else{
                        if(valid){
                            return cb(null,user);
                        } else{
                            return cb(null,false);
                        }
                    }
                });
            }else{
                return cb("user not found");
            }
        }catch(err){
            console.log(err);
        }
    })
)

passport.serializeUser((user,cb)=>{
    cb(null,user);
});

passport.deserializeUser((user,cb)=>{
    cb(null,user);
});
// TODO: Add Passport.js strategies (Local, Google) here

// TODO: Add registration and login routes here
// router.post("/register", ...);

// Export the router to be used in other parts of the application
export default PassportRouter;