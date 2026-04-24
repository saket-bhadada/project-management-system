import express from "express";
import db from "./db.js";

const chatRouter = express.Router();

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function assertParticipant(userId, roomId, res) {
  const { rows } = await db.query(
    `SELECT 1 FROM chat_participants 
     WHERE room_id = $1 AND user_id = $2`,
    [roomId, userId]
  );
  if (!rows.length) {
    res.status(403).json({ error: "You are not a participant in this chat" });
    return false;
  }
  return true;
}

async function assertOwner(roomId, userId, res) {
  const { rows } = await db.query(
    `SELECT 1
     FROM chat_rooms r
     JOIN message m ON m.id = r.message_id
     WHERE r.id = $1 AND m.user_id = $2`,
    [roomId, userId]
  );
  if (!rows.length) {
    res.status(403).json({ error: "Only the message owner can do this" });
    return false;
  }
  return true;
}

// Called from acceptance route when a student is accepted
// This is what auto-creates the chat room
export async function addparticipantonAcceptance(messageId, acceptedUserId) {
  // Step 1 — create the chat room if it does not exist
  const room = await db.query(
    `INSERT INTO chat_rooms(message_id) VALUES($1)
     ON CONFLICT (message_id)
     DO UPDATE SET message_id = EXCLUDED.message_id
     RETURNING id`,
    [messageId]
  );
  const roomId = room.rows[0].id;

  // Step 2 — add the message owner as participant
  await db.query(
    `INSERT INTO chat_participants(room_id, user_id)
     SELECT $1, m.user_id FROM message m WHERE m.id = $2
     ON CONFLICT DO NOTHING`,
    [roomId, messageId]
  );

  // Step 3 — add the accepted student as participant
  await db.query(
    `INSERT INTO chat_participants(room_id, user_id)
     VALUES($1, $2)
     ON CONFLICT DO NOTHING`,
    [roomId, acceptedUserId]
  );

  return roomId;
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// GET /api/chat/room/:messageId
chatRouter.get('/room/:messageId', async (req, res) => {
  const userId    = req.user.id;
  const messageId = req.params.messageId;

  // Check if user is already a participant in this room
  const existing = await db.query(
    `SELECT r.id
     FROM chat_rooms r
     JOIN chat_participants p ON p.room_id = r.id
     WHERE r.message_id = $1 AND p.user_id = $2`,
    [messageId, userId]
  );
  if (existing.rows.length) {
    return res.json({ roomId: existing.rows[0].id });
  }

  // If not a participant — check if they are the owner
  const msg = await db.query(
    `SELECT id, user_id FROM message WHERE id = $1`,
    [messageId]
  );
  if (!msg.rows.length)
    return res.status(404).json({ error: "Message not found" });

  if (msg.rows[0].user_id !== userId)
    return res.status(403).json({ error: "Not a participant" });

  // Owner — create room and add themselves
  const room = await db.query(
    `INSERT INTO chat_rooms(message_id) VALUES($1)
     ON CONFLICT (message_id)
     DO UPDATE SET message_id = EXCLUDED.message_id
     RETURNING id`,
    [messageId]
  );
  const roomId = room.rows[0].id;

  await db.query(
    `INSERT INTO chat_participants(room_id, user_id)
     VALUES($1, $2) ON CONFLICT DO NOTHING`,
    [roomId, userId]
  );

  res.json({ roomId });
});

// GET /api/chat/:roomId/messages
chatRouter.get('/:roomId/messages', async (req, res) => {
  if (!await assertParticipant(req.user.id, req.params.roomId, res)) return;

  const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before;

  const { rows } = await db.query(
    `SELECT cm.id, cm.content, cm.created_at,
            u.id    AS sender_id,
            u.email AS sender_email
     FROM chat_messages cm
     JOIN users u ON u.id = cm.sender_id
     WHERE cm.room_id = $1
       ${before ? `AND cm.created_at < (
           SELECT created_at FROM chat_messages WHERE id = $3
         )` : ''}
     ORDER BY cm.created_at DESC
     LIMIT $2`,
    before
      ? [req.params.roomId, limit, before]
      : [req.params.roomId, limit]
  );

  // return plain array — frontend expects rows directly
  res.json(rows.reverse());
});

// GET /api/chat/:roomId/participants
chatRouter.get('/:roomId/participants', async (req, res) => {
  if (!await assertParticipant(req.user.id, req.params.roomId, res)) return;

  const { rows } = await db.query(
    `SELECT u.id, u.email
     FROM chat_participants cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.room_id = $1`,
    [req.params.roomId]
  );

  // return plain array — frontend expects rows directly
  res.json(rows);
});

// DELETE /api/chat/:roomId/participants/:userId
chatRouter.delete('/:roomId/participants/:userId', async (req, res) => {
  const targetUserId = parseInt(req.params.userId);

  if (targetUserId === req.user.id)
    return res.status(400).json({ error: "You cannot remove yourself" });

  const { rowCount } = await db.query(
    `DELETE FROM chat_participants
     WHERE room_id = $1
       AND user_id = $2
       AND EXISTS (
         SELECT 1 FROM chat_rooms r
         JOIN message m ON m.id = r.message_id
         WHERE r.id = $1 AND m.user_id = $3
       )`,
    [req.params.roomId, targetUserId, req.user.id]
  );

  if (rowCount === 0)
    return res.status(403).json({ error: "Only the message owner can remove participants" });

  res.json({ ok: true });
});

export { chatRouter };