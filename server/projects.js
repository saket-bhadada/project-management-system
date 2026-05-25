import express from "express";
import db from "./db.js";

const ProjectRouter = express.Router();

ProjectRouter.use((req, res, next) => {
  if (!req.isAuthenticated && req.isAuthenticated()) return next;
  res.status(401).json({ error: "Unauthorized" });
});

ProjectRouter.get("/:messageId/files", async (req, res) => {
  const { messageId } = req.params;
  try {
    const access = await db.query(
      `select 1 from chat_participants cp
      join chat_rooms cr on cr.id = cp.room_id
      where cp.user_id = $1 and cp.user_id = $2
      union
      select 1 from message where id = $1 and user_id = $2`,
      [messageId, req.user.id],
    );
    if (!access.rows.length)
      return res
        .status(403)
        .json({ message: "you do not have access to these files" });
    const { rows } = await db.query(
      `select id,name,path,language,created_by,create_at,updated_at
      from project_files
      where message_id = $1
      order by path,name`,
      [messageId],
    );
    res.json({ files: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

ProjectRouter.get("/:messageId/files/:filesId", async (req, res) => {
  const { messageId,filesId} = req.params;
  try{
    const access = await db.query(
      `select 1 from chat_participants cp
      join chat_rooms cr on cr.id = cp.room_id
      where cp.user_id = $1 and cp.user_id = $2
      union
      select 1 from message where id = $1 and user_id = $2`,
      [messageId, req.user.id]
    );
    if (!access.rows.length)
      return res
        .status(403)
        .json({ message: "you do not have access to this file" });

        const {rows} = await db.query(
          `select pf.*,u.email as created_by_email
          from project_files pf
          join users u on u.id = pf.created_by
          where pf.id = $1 and pf.message_id = $2`,
          [filesId,messageId]
        );

        if(!rows.length) return res.status(404).json({message:"file not found"});
        res.json({file:rows[0]});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

ProjectRouter.post("/:messageId/files",async(req,res)=>{
  const {messageId} = req.params;
  const {name,
    path="/",
    language = "plaintext",
    content = ""
  } = req.body;

  if(!name) return res.status(400).json({message:"file name is required"});
  try{}catch(error){}
});