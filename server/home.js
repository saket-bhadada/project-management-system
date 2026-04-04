import express, { application } from "express";
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
        const searchQuery = req.query.search;
        if(searchQuery){
            const response = await db.query(
                `SELECT 
                m.id,
                m.message_text,
                m.created_at,
                m.user_id,
                u.email,
                u.typeofuser
            FROM message m
            JOIN users u ON m.user_id = u.id
            WHERE m.message_text LIKE $1
            ORDER BY m.created_at DESC`,
            [`%${searchQuery}%`]
            );
            res.json({
                user: req.user,
                messages: response.rows
            });
        }
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
homeRouter.post("/messages/:messageId/apply",async(req,res)=>{
    try{
        if(!req.isAuthenticated || !req.isAuthenticated()){
            return res.status(401).json({message:"Not authenticated"});
        }
        const messageId = req.params.messageId;
        const userId = req.user?.id;
        const messageResult = await db.query(
            `SELECT m.user_id, u.typeofuser AS owner_type
             FROM message m
             JOIN users u ON m.user_id = u.id
             WHERE m.id = $1`,
            [messageId]
        );
        if (messageResult.rows.length === 0) {
            return res.status(404).json({ message: "Message not found" });
        }

        const ownerId = messageResult.rows[0].user_id;
        const ownerType = messageResult.rows[0].owner_type;

        if (ownerId === userId) {
            return res.status(403).json({ message: "You cannot apply to your own message" });
        }

        // Option A: disallow applications if the message owner is staff
        // if (ownerType === "staff") {
        //     return res.status(403).json({ message: "Cannot apply to staff-owned messages" });
        // }

        // Option B: disallow staff users from applying to any message
        if (req.user?.typeofuser === "staff") {
            return res.status(403).json({ message: "Staff cannot apply to messages" });
        }
        const applicationResult = await db.query(`
            insert into application (message_id,applicant_id)
            values ($1,$2)
            on conflict (message_id,applicant_id)
            do update set updated_at = now()
            returning *`,
        [messageId,userId]
    );
        res.json({
            success: true,
            application:applicationResult.rows[0]
        })
        // res.json({
        //     success: true,
        //     message: "Application submitted successfully!"
        // })
    }catch(err){
        console.log(err);
        res.status(500).json({message:"Internal server error"});
    }
});
homeRouter.get("/messages/:messageId/applications",async(req,res)=>{
    try{
        if(!req.isAuthenticated || !req.isAuthenticated()){
            return res.status(401).json({message:"Not authenticated"});
        }
        const messageId = req.params.messageId;
        const messageResult = await db.query(
            "select user_id from message where id = $1",
            [messageId]
        );
        if(messageResult.rows.length === 0){
            return res.status(404).json({message:"Message not found"});
        }
        const ownerId = messageResult.rows[0].user_id;
        if(ownerId !== req.user.id){
            return res.status(403).json({message:"You are not the owner of this message"});
        }
        const applicants = await db.query(
            `select a.id, a.status, a.created_at, u.id as applicant_id, u.email as applicant_email
            from application a 
            join users u on a.applicant_id = u.id
            where a.message_id = $1`,
            [messageId]
        );
        res.json(applicants.rows);
    }catch(err){
        console.log(err);
        res.status(500).json({message:"Internal server error"});
    }
});

homeRouter.get("/apply",async(req,res)=>{
    try{
        if(!req.isAuthenticated || !req.isAuthenticated()){
            return res.status(401).json({message:"Not authenticated"});
        }
        const userId = req.user.id;
        const applications = await db.query(
            `select a.id, a.message_id, a.status, a.created_at, m.message_text, u.email
            from application a
            join message m on a.message_id = m.id
            join users u on m.user_id = u.id
            where a.applicant_id = $1
            order by a.created_at desc`,
            [userId]
        );
        res.json(applications.rows);
    }catch(err){
        console.log(err);
        res.status(500).json({message:"Internal server error"});
    }
});
homeRouter.put("/applications/:applicationId/status",async(req,res)=>{
    try{
        if(!req.isAuthenticated|| !req.isAuthenticated()){
            return res.status(401).json({message:"Not authenticated"});
        }

        const applicationId = req.params.applicationId;
        const newStatus = req.body.status;
        if(newStatus !== "pending" && newStatus !== "accepted" && newStatus !== "rejected"){
            res.status(400).json({message:"invalid status value"});
            return;
        }
        const applicationResult = await db.query(
            "update application set status = $1, updated_at = now() where id = $2 returning *",
            [newStatus,applicationId]
        );
        res.json(applicationResult.rows[0]);
    }catch(err){
        console.log(err);
        res.status(500).json({message:"Internal server error"});
    }
});
export default homeRouter;