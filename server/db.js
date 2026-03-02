import pg from "pg";
import dotenv from "dotenv";

// load environment variables first
dotenv.config();

// historical note: older versions of this repo stored the database port in
// `PORT`, which conflicted with the HTTP server.  If the maintainer accidentally
// set `PORT` in their .env, migrate it into `DB_PORT` and then delete it so the
// web service doesn’t pick it up later.
// if (process.env.PORT && !process.env.DB_PORT) {
//     process.env.DB_PORT = process.env.PORT;
//     delete process.env.PORT;
// }

const db = new pg.Client({
    user: process.env.DB_USER || process.env.USER,
    host: process.env.DB_HOST || process.env.HOST,
    database: process.env.DB_DATABASE || process.env.DATABASE,
    password: process.env.DB_PASSWORD || process.env.PASSWORD,
    // use a dedicated variable for the database port so we don't accidentally
    // reuse the same value that the HTTP server uses
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

// connection is triggered from server.js to allow retry logic / logging
export default db;
