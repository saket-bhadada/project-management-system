import WebSocket from "ws";
import passport from "passport";
import db from "./db";
import { addparticipantonAcceptance } from "./chat";

const rooms = new Map();

export function setupChat(server,sessionParser) {
  const wss = new WebSocket.Server({
    server,
    path: "/chat",
  });

  wss.on("connection",(ws,req)=>{
    sessionParser(req,{},()=>{
      passport.initialize()(req,{},()=>{
        passport.session()(req,{},async()=>{
          if(!req.user){
            console.warn("Unauthorized WebSocket connection attempt");
            ws.send(JSON.stringify({type:"error",message:"Unauthorized"}));
            ws.close();
            return;
          }
          const userId = req.user.id;
          let currentRoom = null;

          ws.on("message",async(raw)=>{
            let msg;
            try{
              msg = JSON.parse(raw);
            }catch(e){
              ws.send(JSON.stringify({type:"error",message:"Invalid message format"}));
            }
            if(msg.type === "join"){
              const {rows} = await db.query(`
                select 1 from chat_participants
                where chat_id = $1 and user_id = $2`,
              [msg.roomId,userId]);
              if(rows.length === 0){
                return ws.send(JSON.stringify({type:"error",message:"Not a participant of this chat"}));
              }
              currentRoom = msg.roomId;
              if(!rooms.has(currentRoom)){
                rooms.set(currentRoom,new Set());
              }
              rooms.get(currentRoom).add({ws,userId});

              BroadcastPresence(currentRoom);

              ws.send(JSON.stringify({type:"joined",roomId:currentRoom}));
            }

            if(msg.type === "message"&& currentRoom){
              const check = await db.query(`
                select 1 from chat_participants
                where room_id = $1 and user_id = $2`,
              [currentRoom,userId]);

              if(!check.rows.length){
                return ws.send(JSON.stringify({type:"error",message:"Not a participant of this chat"}));
              }
              if(!msg.content || typeof msg.content.trim()){
                return ws.send(JSON.stringify({type:"error",message:"Message content cannot be empty"}));
              }

              const {rows} = await db.query(`
                insert into chat_messages(room_id,sender_id,content)
                values($1,$2,$3)
                returning id,room_id,sender_id,content,created_at`,
              [currentRoom,userId,msg.content.trim().slice(0,2000)]);

              const user = await db.query(`
                select email from users where id = $1`,
              [userId]);

              const payload = JSON.stringify({
                type:"message",
                id:rows[0].id,
                roomId:rows[0].room_id,
                content:rows[0].content,
                created_at:rows[0].created_at,
                sender_id:rows[0].sender_id,
                sender_email:user.rows[0].email
              });

              rooms.get(currentRoom).foreach(client=>{
                if(client.ws.readyState === WebSocket.OPEN){
                  client.ws.send(payload);
                }
              });
            }

            if(msg.type === "leave" && currentRoom){
              leaveRoom(ws,currentRoom);
              currentRoom = null;
            }
          });

          ws.on("close",()=>{
            if(currentRoom){
              leaveRoom(ws,currentRoom);
            }
          });

          ws.on("error",(err)=>{
            console.error("WebSocket error:",userId,err);
          });
        });
      });
    });
  });
  console.log("Chat WebSocket server initialized");
}

function leaveRoom(ws,currentRoom){
  const room = rooms.get(currentRoom);
  if(!room) return;
  room.forEach(c=>{
    if(c.ws === ws) room.delete(c);
  });
  if(room.size === 0){
    rooms.delete(currentRoom);
  }
  else{
    BroadcastPresence(roomId);
  }
}

function BroadcastPresence(roomId){
  const online = [...(rooms.get(roomId)||[])].map(c=>c.userId);
  const payload = JSON.stringify({type:"presence",online});
  rooms.get(roomId).forEach(client=>{
    if(client.ws.readyState === WebSocket.OPEN){
      client.ws.send(payload);
    }
  })
}