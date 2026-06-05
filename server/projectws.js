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
            }
          });
        });
      });
    });
  });
}
