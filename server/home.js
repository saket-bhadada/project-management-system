import express from "express";
import { Router } from "express";
import db from "./db.js";

const homeRouter = express.Router();

homeRouter.get("/home",async(req,res)=>{
    console.log("Checking auth...");
    console.log("req.isAuthenticated type:", typeof req.isAuthenticated);
    if(req.isAuthenticated) console.log("req.isAuthenticated is:", req.isAuthenticated.toString());

    if(!req.isAuthenticated || !req.isAuthenticated()){
        res.redirect("/login");
        console.log("not logged in");
    }else{
        console.log("logged in");
        res.json({user:req.user});
        try{
            const data = await db.query();
            res.json(data);
        }catch(err){
            console.log(err);
            res.status(500).json({ message: "Internal server error" });
        }
    }
});

export default homeRouter;