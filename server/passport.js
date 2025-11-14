import express from "express";
import passport from "passport";
// import pg from "pg";
import bcrypt, { hash } from "bcrypt";
import { Strategy as LocalStrategy, Strategy } from "passport-local";

// Create a new router object
const PassportRouter = express.Router();
const saltround = 10;

// Define a GET route on this router
PassportRouter.get("/",(req,res)=>{
    // Send a single JSON response
    res.json({ message: "hello world" });
});

PassportRouter.post("/login",
    passport.authenticate("local",{
        successRedirect:"/home",
        failureRedirect:"/login"
        // failureFlash: true // Optionally, enable flash messages for login failures
    })
)

PassportRouter.post("/register",async (req,res)=>{
    const { email, password, typeuser } = req.body;
    try{
        const checkresult = await db.query();
        if(checkresult.row.length>0){
            res.redirect("/login");
        }else{
            bcrypt.hash(password,saltround,async(err,hash)=>{
                if(err){
                    console.error("error hashing the password", err);
                }else{
                    const result = await db.query();
                    const user = result.rows[0];
                    req.login(user,(err)=>{
                        console.log("success");
                        res.redirect("/home");
                    });
                }
            });
        }
    }catch(err){
        console.log(err);
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
            if(result.row.length>0){
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