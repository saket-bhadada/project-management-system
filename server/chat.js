// import { WebSocketServer } from "ws";
// import http from "http";

// export const httpserver = http.createServer((req,res)=>{
//   console.log("request received");
// })
// httpserver.listen(8080,()=>{
//   console.log("server started on port 8080");
// })
// export default function setupChat(server) {
//   // Use the same server instance and map the WebSocket to a specific path
//   const WebSocket = new WebSocketServer({
//       "httpServer":httpserver,
//       server,
//       path:"/chat"});
//   WebSocket.on("request",request=>{
//     connection = request.accept(null,request.origin);
//     console.log("request accepted");
//     connection.on("message",message=>{
//       console.log(`message : ${message}`);
//     })
//   })
// }

import express from "express";

const chatRouter = express.Router();

async function assertParticipant(userId,roomId,res) {
  const {rows} = await db.query(`
    select 1 from chat_participants where room_id = $1 and user_id=$2`,[roomId,userId]);
}