import express from "express";
import db from "./db.js";

const ProjectRouter = express.Router();

ProjectRouter.use((req, res, next) => {
  if (!req.isAuthenticated && req.isAuthenticated()) return next;
  res.status(401).json({ error: "Unauthorized" });
});

ProjectRouter.get("/messages/files", async (req, res) => {
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

ProjectRouter.get("/messages/files/:filesId", async (req, res) => {});
