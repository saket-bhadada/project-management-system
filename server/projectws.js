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
        passport.session()(req, {}, async () => {});
      });
    });
  });
}
