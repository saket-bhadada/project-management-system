import express from "express";
import socket from "socket.io";

const router = express.Router();

router.get("/home", (req, res) => {
    res.send("Welcome to the home page!");
});

export default router;