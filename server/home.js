import express from "express";
import { Router } from "express";

const homeRouter = express.Router();

homeRouter.get("/profile",async(req,res)=>{
    if(!req.isAuthenticated){
        res.redirect("/login");
    }else{
        res.json({user:req,user});
        try{}catch(err){}
    }
});

export default homeRouter;