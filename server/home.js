import express from "express";
import { Router } from "express";

const homeRouter = express.Router();

homeRouter.get("/home",async(req,res)=>{
    if(!req.isAuthenticated){
        res.redirect("/login");
        console.log("not logged in");
    }else{
        console.log("logged in");
        res.json({user:req.user});
        try{
            const data = await db.query();
            res.json(data);
        }catch(err){}
    }
});

export default homeRouter;