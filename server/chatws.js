import WebSocket, { WebSocketServer } from "ws";
import passport from "passport";
import db from "./db.js";

const rooms = new Map();

export function setupChat(server, sessionParser) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/chat",
  });

  wss.on("connection", (ws, req) => {
    sessionParser(req, {}, () => {
      passport.initialize()(req, {}, () => {
        passport.session()(req, {}, async () => {

          if (!req.user) {
            ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
            ws.close();
            return;
          }

          const userId = req.user.id;
          let currentRoom = null;

          ws.on("message", async (raw) => {
            let msg;
            try {
              msg = JSON.parse(raw);
            } catch {
              return ws.send(JSON.stringify({
                type: "error",
                message: "Invalid message format"
              }));
            }

            // ── JOIN ──
            if (msg.type === "join") {
              try {
                const { rows } = await db.query(
                  `SELECT 1 FROM chat_participants
                   WHERE room_id = $1 AND user_id = $2`,
                  [msg.roomId, userId]
                );
                if (!rows.length) {
                  console.warn(`User ${userId} attempted to join room ${msg.roomId} without being a participant`);
                  return ws.send(JSON.stringify({
                    type: "error",
                    message: "Not a participant of this chat"
                  }));
                }
                currentRoom = msg.roomId;
                if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
                rooms.get(currentRoom).add({ ws, userId });
                broadcastPresence(currentRoom);
                ws.send(JSON.stringify({ type: "joined", roomId: currentRoom }));
                console.log(`User ${userId} joined room ${currentRoom}`);
              } catch (err) {
                console.error("WebSocket join error:", err.message);
                ws.send(JSON.stringify({ type: "error", message: "Failed to join room" }));
              }
            }

            // ── MESSAGE ──
            if (msg.type === "message" && currentRoom) {
              try {
                const check = await db.query(
                  `SELECT 1 FROM chat_participants
                   WHERE room_id = $1 AND user_id = $2`,
                  [currentRoom, userId]
                );
                if (!check.rows.length) {
                  return ws.send(JSON.stringify({
                    type: "error",
                    message: "Not a participant of this chat"
                  }));
                }
                if (!msg.content || !msg.content.trim()) {
                  return ws.send(JSON.stringify({
                    type: "error",
                    message: "Message cannot be empty"
                  }));
                }

                const { rows } = await db.query(
                  `INSERT INTO chat_message(room_id, sender_id, content)
                   VALUES($1, $2, $3)
                   RETURNING id, room_id, sender_id, content, created_at`,
                  [currentRoom, userId, msg.content.trim().slice(0, 2000)]
                );

                const user = await db.query(
                  `SELECT email FROM users WHERE id = $1`,
                  [userId]
                );

                const payload = JSON.stringify({
                  type:         "message",
                  id:           rows[0].id,
                  room_id:      rows[0].room_id,
                  content:      rows[0].content,
                  created_at:   rows[0].created_at,
                  sender_id:    rows[0].sender_id,
                  sender_email: user.rows[0].email
                });

                console.log(`Message stored and broadcasting to room ${currentRoom}`);
                rooms.get(currentRoom)?.forEach(client => {
                  if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(payload);
                  }
                });
              } catch (err) {
                console.error("WebSocket message storage error:", err.message);
                ws.send(JSON.stringify({ type: "error", message: "Failed to store message" }));
              }
            }

            // ── LEAVE ──
            if (msg.type === "leave" && currentRoom) {
              leaveRoom(ws, currentRoom);
              currentRoom = null;
            }
          });

          ws.on("close", () => {
            if (currentRoom) leaveRoom(ws, currentRoom);
          });

          ws.on("error", (err) => {
            console.error("WebSocket error for user", userId, err.message);
          });

        });
      });
    });
  });

  console.log("Chat WebSocket server initialized on /ws/chat");
}

function leaveRoom(ws, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.forEach(c => { if (c.ws === ws) room.delete(c); });
  if (room.size === 0) {
    rooms.delete(roomId);
  } else {
    broadcastPresence(roomId);  // fixed: was using undefined variable roomId
  }
}

function broadcastPresence(roomId) {
  const online  = [...(rooms.get(roomId) || [])].map(c => c.userId);
  const payload = JSON.stringify({ type: "presence", online });
  rooms.get(roomId)?.forEach(client => {  // fixed: added ?. to avoid crash on empty room
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  });
}