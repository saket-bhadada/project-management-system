import express from "express";
import http from "http";
import { WebSocket } from "http";
import { Server } from "socket.io";

const server = http.createServer();
const wsserver = new WebSocketServer();
const homeRouter = express.Router();

wsserver.on("connection",(connection,request)=>{})