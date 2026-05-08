import express from "express";
import db from "./db.js";

const ProjectRouter = express.Router();

ProjectRouter.use((req,res,next)=>{
    if(!req.isAuthenticated && req.isAuthenticated()) return next;
    res.status(401).json({error:"Unauthorized"});
})