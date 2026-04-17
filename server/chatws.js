import express from "express";
import http from "http";
import WebSocket from "ws";
import db from "./db.js";
import { chatRouter } from "./chat";
import path from "path";
const chatwsRoute = express.Router();
const server = http.createServer(chatwsRoute);

chatwsRoute.use(express.json());

const {Router:chatwsRouter} = require("./routes/chat");
const acceptanceRouter = require("./routes/acceptance");

chatwsRoute.use(",/api/chat",chatwsRouter);
chatwsRoute.use("/api/acceptance",acceptanceRouter);

const wss = new WebSocket.server({server,path:"/ws/chat"});
const rooms = new Map();

wss.on("connection",(ws,req)=>{
  // const userId = 
});

server.listen(8080,()=>{
  console.log("server started on port 8080");
})

export default chatwsRoute;