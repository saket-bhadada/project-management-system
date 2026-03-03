import { WebSocketServer } from "ws";
import url from "url";
// import uuidv4 from "uuid";
import { v4 as uuidv4 } from "uuid";

export default function setupChat(server) {
  const wsServer = new WebSocketServer({
    server,
    path: "/chat",
  });

  const connections = { };
  const users = { };

    wsServer.on("connection", (connection,request) => {
        // const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
        // const username = requestUrl.searchParams.get("username");
        const requestUrl = url.parse(request.url, true); // 'true' parses the query string into an object
        const username = requestUrl.query.username;
        const uuid = uuidv4();
        console.log(`New connection from user: ${username} (UUID: ${uuid})`);
        connections[uuid] = connection;

        users[uuid]={
          username: username,
          message:request.body?.message || "",
          uuid:uuid
        }
        // console.log("New connection from user:", username);
    }); 
}