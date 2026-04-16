import express from "express";
import http from "http";
import WebSocket from "ws";
import db from "./db.js";
import { chatRouter } from "./chat";
const chatwsRoute = express.Router();

const server = http.createServer(chatwsRoute);

server.listen(8080,()=>{
  console.log("server started on port 8080");
})

export default chatwsRoute;