import WebSocket, { WebSocketServer } from "ws";
import passport from "passport";
import db from "./db.js";

// projectId → Set of { ws, userId, email, activeFile }
const projectRooms = new Map();

export function setupProjectWS(server, sessionParser) {
  const wss = new WebSocketServer({ server, path: "/ws/project" });

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
          const userEmail = req.user.email;
          let currentProject = null; // messageId

          ws.on("message", async (raw) => {
            let msg;
            try {
              msg = JSON.parse(raw);
            } catch {
              return;
            }

            // ── JOIN PROJECT ──
            if (msg.type === "join_project") {
              const projectId = String(msg.projectId);

              // Verify access
              const access = await db.query(
                `SELECT 1 FROM chat_participants cp
                 JOIN chat_rooms cr ON cr.id = cp.room_id
                 WHERE cr.message_id = $1 AND cp.user_id = $2
                 UNION
                 SELECT 1 FROM message WHERE id = $1 AND user_id = $2`,
                [projectId, userId],
              );
              if (!access.rows.length) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Not a participant",
                  }),
                );
                return;
              }

              currentProject = projectId;
              if (!projectRooms.has(projectId))
                projectRooms.set(projectId, new Set());
              projectRooms
                .get(projectId)
                .add({ ws, userId, email: userEmail, activeFile: null });

              ws.send(JSON.stringify({ type: "joined_project", projectId }));
              broadcastPresence(projectId);
              console.log(`User ${userEmail} joined project ${projectId}`);
            }

            // ── FILE EDIT (live typing) ──
            if (msg.type === "file_edit" && currentProject) {
              const { fileId, content, cursorLine, cursorCol } = msg;
              if (!fileId || content === undefined) return;

              // Broadcast to all other clients in same project
              const payload = JSON.stringify({
                type: "file_edit",
                fileId,
                content,
                cursorLine: cursorLine || 0,
                cursorCol: cursorCol || 0,
                editorId: userId,
                editorEmail: userEmail,
                timestamp: Date.now(),
              });

              projectRooms.get(currentProject)?.forEach((client) => {
                if (
                  client.ws !== ws &&
                  client.ws.readyState === WebSocket.OPEN
                ) {
                  client.ws.send(payload);
                }
              });
            }

            // ── FILE SAVE ──
            if (msg.type === "file_save" && currentProject) {
              const { fileId, content, changeSummary } = msg;
              if (!fileId || content === undefined) return;

              try {
                // Persist to DB
                await db.query(
                  `UPDATE project_files SET content = $1, updated_at = NOW()
                   WHERE id = $2 AND message_id = $3`,
                  [content, fileId, currentProject],
                );
                await db.query(
                  `INSERT INTO project_file_versions (file_id, content, changed_by, change_summary)
                   VALUES ($1, $2, $3, $4)`,
                  [fileId, content, userId, changeSummary || "Saved"],
                );

                // Broadcast save event to everyone including sender
                const payload = JSON.stringify({
                  type: "file_saved",
                  fileId,
                  content,
                  savedBy: userEmail,
                  savedById: userId,
                  changeSummary: changeSummary || "Saved",
                  timestamp: Date.now(),
                });
                projectRooms.get(currentProject)?.forEach((client) => {
                  if (client.ws.readyState === WebSocket.OPEN)
                    client.ws.send(payload);
                });

                console.log(
                  `File ${fileId} saved by ${userEmail} in project ${currentProject}`,
                );
              } catch (err) {
                console.error("Save error:", err.message);
                ws.send(
                  JSON.stringify({ type: "error", message: "Save failed" }),
                );
              }
            }

            // ── FILE CREATED ──
            if (msg.type === "file_created" && currentProject) {
              const payload = JSON.stringify({
                type: "file_created",
                file: msg.file,
                createdBy: userEmail,
                timestamp: Date.now(),
              });
              projectRooms.get(currentProject)?.forEach((client) => {
                if (
                  client.ws !== ws &&
                  client.ws.readyState === WebSocket.OPEN
                ) {
                  client.ws.send(payload);
                }
              });
            }

            // ── FILE DELETED ──
            if (msg.type === "file_deleted" && currentProject) {
              const payload = JSON.stringify({
                type: "file_deleted",
                fileId: msg.fileId,
                deletedBy: userEmail,
                timestamp: Date.now(),
              });
              projectRooms.get(currentProject)?.forEach((client) => {
                if (
                  client.ws !== ws &&
                  client.ws.readyState === WebSocket.OPEN
                ) {
                  client.ws.send(payload);
                }
              });
            }

            // ── CURSOR MOVE (for showing other users' cursors) ──
            if (msg.type === "cursor_move" && currentProject) {
              const payload = JSON.stringify({
                type: "cursor_move",
                fileId: msg.fileId,
                line: msg.line,
                col: msg.col,
                userId,
                userEmail,
                timestamp: Date.now(),
              });
              projectRooms.get(currentProject)?.forEach((client) => {
                if (
                  client.ws !== ws &&
                  client.ws.readyState === WebSocket.OPEN
                ) {
                  client.ws.send(payload);
                }
              });
            }

            // ── ACTIVE FILE CHANGE ──
            if (msg.type === "viewing_file" && currentProject) {
              // Update which file this user is viewing
              projectRooms.get(currentProject)?.forEach((client) => {
                if (client.ws === ws) client.activeFile = msg.fileId;
              });
              const payload = JSON.stringify({
                type: "user_viewing",
                fileId: msg.fileId,
                userId,
                userEmail,
              });
              projectRooms.get(currentProject)?.forEach((client) => {
                if (
                  client.ws !== ws &&
                  client.ws.readyState === WebSocket.OPEN
                ) {
                  client.ws.send(payload);
                }
              });
            }
          });

          ws.on("close", () => {
            if (currentProject) {
              const room = projectRooms.get(currentProject);
              if (room) {
                room.forEach((c) => {
                  if (c.ws === ws) room.delete(c);
                });
                if (room.size === 0) projectRooms.delete(currentProject);
                else broadcastPresence(currentProject);
              }
            }
          });

          ws.on("error", (err) =>
            console.error("ProjectWS error:", err.message),
          );
        });
      });
    });
  });

  console.log("Project WebSocket initialized on /ws/project");
}

function broadcastPresence(projectId) {
  const room = projectRooms.get(projectId);
  if (!room) return;
  const online = [...room].map((c) => ({
    userId: c.userId,
    email: c.email,
    activeFile: c.activeFile,
  }));
  const payload = JSON.stringify({ type: "presence", online });
  room.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(payload);
  });
}
