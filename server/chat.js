import { WebSocketServer } from "ws";
import url from "url";
import uuid from "uuid.v4";

export default function setupChat(server) {
  const wsServer = new WebSocketServer({
    server,
    path: "/chat",
  });

    wsServer.on("connection", (connection,request) => {
        // const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
        // const username = requestUrl.searchParams.get("username");
        const requestUrl = url.parse(request.url, true); // 'true' parses the query string into an object
        const username = requestUrl.query.username;
        const uuidValue = uuid.v4();
        console.log(`New connection from user: ${username} (UUID: ${uuidValue})`);
        // console.log("New connection from user:", username);
    }); 
}