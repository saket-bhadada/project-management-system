import http from 'http';
import WebSocketServer from 'ws';

const server = http.createServer() //to take to http server
const wsServer = new WebSocketServer({server})