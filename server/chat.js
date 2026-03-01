import { WebSocketServer } from "ws";
import url from "url";

export default function setupChat(server) {
  const wsServer = new WebSocketServer({
    server,
    path: "/chat",
  });

    wsServer.on("connection", (connection,request) => {
        const {username} = url.parse(request.url, true).query;
        console.log("New connection from user:", username);
    }); 
}