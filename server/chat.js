import express from 'express';
// import WebSocket,{ WebSocketServer } from 'ws';
import http from 'http';
import { Server } from 'socket.io';

const app = express.Router();
const server = http.createServer(app);

const chat = express.Router();