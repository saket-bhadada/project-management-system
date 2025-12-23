import express, { Router } from "express";

chatRouter = Router.express();

chatRouter.get("/api/chat/:userId",async(req,res)=>{
    if(!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).json({error:"not authenticated"});
    try{
    }catch(err){
        console.error(err);
        return res.status(500).json({error:"internal server error"});
    }
});