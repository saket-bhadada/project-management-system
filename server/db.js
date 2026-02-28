import pg from "pg";
import dotenv from "dotenv";

dotenv.config();


const db = new pg.Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    // use a dedicated variable for the database port so we don't accidentally
    // reuse the same value that the HTTP server uses
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

// connection is triggered from server.js to allow retry logic / logging
export default db;
