import pg from "pg";
import dotenv from "dotenv";

dotenv.config();


const db = new pg.Client({
    user: process.env.USER,
    host: process.env.HOST,
    database:process.env.DATABASE,
    password:process.env.PASSWORD,
    port:process.env.PORT,
});

db.connect();

export default db;
