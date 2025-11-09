import express from "express";
import passport from "passport";
// import pg from "pg";
// import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";

// Create a new router object
const router = express.Router();

// Define a GET route on this router
router.get("/",(req,res)=>{
    // Send a single JSON response
    res.json({ message: "hello world" });
});

// TODO: Add Passport.js strategies (Local, Google) here

// TODO: Add registration and login routes here
// router.post("/register", ...);

// Export the router to be used in other parts of the application
export default router;