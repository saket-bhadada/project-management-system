import express from "express";
import db from "./db.js";
import { RETENTION_OPTION } from "./cleanup.js";

const rententionRouter = express.Router();

rententionRouter.get("/chat/:roomId/retention", async (req, res) => {
  if (!req.isAuthenticated?.()) return res.status(401).send("Unauthorized");

  const { roomId } = req.params;
  try {
    const { rows } = await db.query(
      `select cr.retention_hours
      from chat_rooms cr
      join chat_participants cp on cp.room_id = cr.id
      where cr.id = $1 and cp.user_id = $2`,
      [roomId, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Room not found" });

    res.json({
      retention_hours: rows[0].retention_hours,
      option: RETENTION_OPTION,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

rententionRouter.get("/chat/:roomId/retention", async (req, res) => {
  if (!req.isAuthenticated?.()) return res.status(401).send("Unauthorized");

  const { roomId } = req.params;
  const { retention_hours } = req.body;
  const allowed = RETENTION_OPTION.map((o) => o.hours);
  if (!allowed.includes(Number(retention_hours))) {
    return res.status(400).json({ message: "Invalid retention hours" });
  }

  try {
    const ownerCheck = await db.query(
      `select 1
      from chat_rooms cr
      join cr.id = $1 and m.user_id = $2`,
      [roomId, req.user.id],
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
