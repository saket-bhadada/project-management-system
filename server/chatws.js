import WebSocket from "ws";
import passport from "passport";
import db from "./db";
import { addparticipantonAcceptance } from "./chat";

const rooms = new Map();

export function setupChat(server,sessionParser) {
  const wss = new WebSocket.server({
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
            }
          })
        });
      })
    });
  });
}