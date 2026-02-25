import express from 'express';
// import WebSocket,{ WebSocketServer } from 'ws';
import http from 'http';
import { Server } from 'socket.io';

const chat = express.Router();
const server = http.createServer(chat);

const io = new Server(server,{cors:{
    origin:"http://localhost:3000/chat",
    methods:["GET","POST"],
    credentials:true
}});