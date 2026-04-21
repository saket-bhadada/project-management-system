import WebSocket from "ws";
import passport from "passport";
import db from "./db";
import { addparticipantonAcceptance } from "./chat";

const rooms = new Map();

export function setupChat(server) {}