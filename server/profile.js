import express from "express";
import db from "./db.js";

const profileRouter = express.Router();

profileRouter.get("/profile",async(req,res)=>{
    if(req.isAuthenticated()){
        res.json({user:req.user});
    }else{
        res.redirect("/login");
    }
});
profileRouter.post("/messages",async(req,res)=>{
    try{
        if(!(req.isAuthenticated && req.isAuthenticated())){
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const message_text = (req.body && (req.body.message || req.body.message_text)) || '';
        if(!message_text || typeof message_text !== 'string'){
            return res.status(400).json({ error: 'message is required' });
        }
        const data = await db.query(
            "INSERT INTO message (user_id,message_text) VALUES ($1,$2) RETURNING *",
            [req.user.id, message_text]
        );
        return res.status(201).json({ success: true, message: data.rows[0] });
    }catch(err){
        console.error('POST /messages error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
profileRouter.delete("/message/:id", async (req, res) => {
    try{
        if (!(req.isAuthenticated && req.isAuthenticated())) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        if (req.user.role !== "staff") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const messageId = parseInt(req.params.id, 10);
        if (Number.isNaN(messageId)) return res.status(400).json({ message: 'Invalid id' });

        const result = await db.query(
            "DELETE FROM message WHERE id = $1 RETURNING *",
            [messageId]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ message: "Message not found" });
        }

        return res.json({ success: true });
    }catch(err){
        console.error('DELETE /messages/:id error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

export default profileRouter;