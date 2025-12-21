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
        try{
            const data = await db.query(`
            SELECT 
                m.id,
                m.message_text,
                m.created_at,
                m.user_id,
                u.email,
                u.typeofuser
            FROM message m
            JOIN users u ON m.user_id = u.id
            ORDER BY m.created_at DESC
        `);
            res.json({
                user: req.user,
                messages: data.rows
            });
        }catch(err){
            console.log(err);
            res.status(500).json({ message: "Internal server error" });
        }
    }
});

export default homeRouter;