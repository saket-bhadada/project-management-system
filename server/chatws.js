import express from "express";
import http from "http";

const chatwsRoute = express.Router();

const server = http.createServer(chatwsRoute);

server.listen(8080,()=>{
  console.log("server started on port 8080");
})

export default chatwsRoute;