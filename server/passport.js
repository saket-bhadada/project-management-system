import express from "express";
import passport from "passport";
// import pg from "pg";
// import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";

// Create a new router object
const PassportRouter = express.Router();

// Define a GET route on this router
PassportRouter.get("/",(req,res)=>{
    // Send a single JSON response
    res.json({ message: "hello world" });
});

PassportRouter.post("/register",(req,res)=>{
    const { email, password } = req.body;
    // Accept either `userType` (frontend) or `usertype` (backend) and normalize
    const userType = req.body.userType || req.body.usertype;
    console.log(email, password, userType);
    res.json({ message: "User registered successfully!", userType });
});
PassportRouter.post("/login",(req,res)=>{
    const {email,password}=req.body;
    console.log(email,password);
  res.json({ message: "User logged in successfully!" });
});
// TODO: Add Passport.js strategies (Local, Google) here

// TODO: Add registration and login routes here
// router.post("/register", ...);

// Export the router to be used in other parts of the application
export default PassportRouter;