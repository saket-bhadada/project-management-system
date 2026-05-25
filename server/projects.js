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
  try{
     const access = await db.query(
      `SELECT 1 FROM chat_participants cp
       JOIN chat_rooms cr ON cr.id = cp.room_id
       WHERE cr.message_id = $1 AND cp.user_id = $2
       UNION
       SELECT 1 FROM message WHERE id = $1 AND user_id = $2`,
      [messageId, req.user.id]
    );
    if (!access.rows.length)
      return res.status(403).json({ error: "Not a project participant" });

    const {rows} = await db.query(
      `insert into project_files (message_id,name,path,language,content,created_by)
      values ($1,$2,$3,$4,$5,$6)
      return *`,
      [messageId,name,path,language,content,req.user.id]
    );

    await db.query(
      `insert into project_files_version (file_id,content,changed_by,change_summery)
      values ($1,$2,$3,'file created')`,
      [rows[0].id,content,req.user.id]
    );

    res.status(404).json(rows[0]);
  }catch(error){
    if(error.code === '23505')
      return res.status(409).json({error:"file already exists at that path"});
    console.error(error);
    res.status(500).json({error:"server error"});
  }
});

ProjectRouter.put("/:messageId/files/:fileId",async(req,res)=>{
  const {messageId,fileId} = req.params;
  const {content,change_summery = "update"} = req.body;

  try{
    const access = await db.query(
      `SELECT 1 FROM chat_participants cp
       JOIN chat_rooms cr ON cr.id = cp.room_id
       WHERE cr.message_id = $1 AND cp.user_id = $2
       UNION
       SELECT 1 FROM message WHERE id = $1 AND user_id = $2`,
      [messageId, req.user.id]
    );
    if (!access.rows.length)
      return res.status(403).json({ error: "Not a project participant" });
    

    const {rows} = await db.query(
      `update project_files
      set content = $1, updated_at = now()
      where id = $2 and message_id = $3
      return *`,
      [content,fileId,messageId]
    );
    if(!rows.length) return res.status(404).json({message:"file not found"});

    await db.query(
      `insert into project_files_version (file_id,content,changed_by,change_summery)
      values ($1,$2,$3,$4)`,
      [fileId,content,req.user.id,change_summery]
    );

    res.json(rows[0]);
  }catch(err){
    console.error(err);
    res.status(500).json({error:"server error"});
  }
});