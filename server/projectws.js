import { WebSocketServer } from "ws";
import Websocket from "ws";
import express from "express";
import db from "./db.js";
import passport from "passport";

const projectRooms = new Map();

export function setupProjectWS(server, sessionParser) {
  const ws = new WebSocketServer({ server, path: "/ws/project" });
  ws.on("connection", (ws, req) => {
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

          let currentProject = null;

          ws.on("message", async (raw) => {
            let msg;
            try {
              msg = JSON.parse(raw);
            } catch {
              return;
            }

            if (msg.type === "join_project") {
              const projectId = String(msg.projectId);
              const access = await db.query(
                `select 1 from chat_participants cp
                join chat_rooms cr on cr.id = cp.room_id
                where cr.message_id = $1 and cp.user_id = $2
                union
                select 1 from message where id = $1 and user_id = $2`,
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
                projectRooms.set(projectId, new set());
              projectRooms
                .get(projectId)
                .add({ ws, userId, email: userEmail, activeFile: null });
              ws.send(JSON.stringify({ type: "joined_project", projectId }));
              broadcastPresence(projectId);
              console.log(`user ${userEmail} joined project ${projectId}`);
            }
            if (msg.type === "file_edit" && currentProject) {
              const { fileId, content, cursorLine, cursorCol } = msg;
              if (!fileId || content === undefined) return;

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
                  client.ws.readyState === Websocket.OPEN
                ) {
                  client.ws.send(payload);
                }
              });
            }
            if (msg.type === "file_save" && currentProject) {
              const { fileId, content, changeSummary } = msg;
              if (!fileId || content === undefined) return;
              try {
                await db.query(
                  `update project_files set content = $1, updated_at = NOW()
                  where id = $2 and message_id = $3`,
                  [content, fileId, currentProject],
                );
                await db.query(
                  `insert into project_file_versions (file_id,content,changed_by,change_summary)
                  values ($1,$2,$3,$4)`,
                  [fileId, content, userId, changeSummary || "saved"],
                );
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
            }
          });
        });
      });
    });
  });
}
