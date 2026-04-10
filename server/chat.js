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
  if(!rows.length){
    res.status(403).json({message:"You are not a participant in this chat"});
    return false;
  }
  return true;
}

async function asserOwner(roomId,userId,res){
  const {rows} = await db.query(`
    select 1
    from chat_rooms r
    join message m on m.id = r.message_id
    where r.id = $1 and m.user_id=$2`,
  [roomId,userId]);
  if(!rows.length){
    res.status(403).json({error:'not a participant'});
    return false;
  }
  return true;
}

chatRouter.get('/api/room/:messageId',async(req,res)=>{
  const userId = req.user.id;
  const messageId = req.params;
  const existing = await db.query(`
    select r.id
    from chat_rooms r
    join message m on m.id = r.message_id
    where r.message_id = $1 and m.user_id = $2`,
    [messageId,userId]);
    if(existing.rows.length){
      return res.json({roomId:existing.rows[0].id});
    }
    const msg = await db.query(`
      select id, user_id from message where id = $1`,[messageId]
    );
    if(!msg.rows.length){
      return res.status(404).json({message:"message not found"});
    }
    if(msg.rows[0].user_id != userId){
      return res.status(404).json({error:"not a participant"});
    }
    const room = await db.query(`
      insert into chat_rooms(message_id) values ($1)
      on conflict (message_id) do update set message_id = excluded.message_id
      returning id`,
      [messageId]
    );
    const roomId = room.rows[0].id;
    await db.query(`
      insert into chat_participants(room_id,user_id) values ($1,$2),`[roomId,userId]);

    res.json({roomId});
});