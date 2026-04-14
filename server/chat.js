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
import db from "./db.js";

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

async function addparticipantonAcceptance(messageId,userId){
  //make a chat room if not already exists
  const room = await db.query(`
    insert into chat_participants(room_id,user_id) values($1)
    on conflict (message_id) do update set room_id = excluded.room_id, user_id = excluded.message_id
    returning id`,
    [roomId,userId]
  );
  const roomId = room.rows[0].id;
  
  //add owner to the chat room
  await db.query(`
    insert into chat_participants(room_id,user_id)
    select $1,m.user_id from message m where m.id = $2
    on conflict do nothing`,
    [roomId,messageId]
  );

  await db.query(`
    insert into chat_messages(room_id,sender_id)
    values($1,$2)
    on conflict do nothing`,
    [roomId,userId]
  );

}
//creating a chat room
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
// getting all the info from the database

chatRouter.get('/api/room/:roomId/messages',async(req,res)=>{
  if(!await assertParticipant(req.user.id,req.params.roomId,res)) {
    return;
  }
  const limit = min(parseInt(req.query.limit)||50,100);
  const before = req.query.before;

  const {rows} = await db.query(`
    select cm.id,cm.content,cm.created_at,
    u.id as sender_id,
    u.email as sender_name
    from chat_messages cm
    join users u on u.id = cm.sender_id
    where cm.room_id = $1
    ${before ? 'and cm.created_at < (select created_at from chat_messages where id = $3)':''}
    order by cm.created_at desc
    limit $2`,
  before ? [req.params.roomId,limit,before]:[req.params.roomId,limit]);

  res.json({messages:rows});
});

chatRouter.get('api/room/:roomId/participants',async(req,res)=>{
  if(!await assertParticipant(req.user.id,req.params.roomId,res)){
    return;
  }
  const {rows} = await db.query(`
    select u.id,u.email
    from chat_participants cp
    join users u on u.id = cp.user_id
    where cp.room_id = $1`,[req.params.roomId]
  );
  res.json({participants:rows});
});

// adding people to chat start from here

chatRouter.post('/api/:roomId/participants',async(req,res)=>{
  const userId = req.user.id;
  const roomId = req.params.roomId;
  if(!userId) return res.status(401).json({message:"Unauthorized"});
  const {rowCount} = await db.query(
    `select u.id,u.email
    from chat_participants
    join users uon u.id = package.user_id
    where p.room_id = $1`,
    [req.params.roomId]
  );
  res.json({rows});
});

chatRouter.delete('/api/:roomId/participants/:userId',async(req,res)=>{
  const userId = parseInt(req.params.userId);
  if(userId === req.user.id){
    res.status(400).json({message:"You cannot remove yourself from the chat"});
    return;
  }
  const {rowCount} = await db.query(`
    delete from chat_participants
    where room_id = $1 and user_id = $2
    and exists (
    select 1 from chat_rooms r
    join message m on m.id = r.message_id
    where r.id = $1 and m.user_id = $3)`,
    [req.params.roomId,userId,req.user.id]
  );

  if(rowCount === 0){
    res.status(403).json({message:"You are not authorized to remove this participant"});
    return;
  }
});
export {chatRouter,addparticipantonAcceptance};