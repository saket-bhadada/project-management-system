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
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

// Handle unexpected errors on the client
db.on('error', (err) => {
    console.error('Database client error:', err.message);
});

export default db;

// Ensures required tables exist in the database.
export async function initSchema() {
    try {
        // 1. Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                typeofuser TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // 2. Message table (original posts)
        await db.query(`
            CREATE TABLE IF NOT EXISTS message (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message_text TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // 3. Application table
        await db.query(`
            CREATE TABLE IF NOT EXISTS application (
                id SERIAL PRIMARY KEY,
                message_id INTEGER NOT NULL REFERENCES message(id) ON DELETE CASCADE,
                applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (message_id, applicant_id)
            );
        `);

        // 4. Chat Rooms
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_rooms (
                id SERIAL PRIMARY KEY,
                message_id INTEGER NOT NULL UNIQUE REFERENCES message(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // 5. Chat Participants
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_participants (
                id SERIAL PRIMARY KEY,
                room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (room_id, user_id)
            );
        `);

        // 6. Chat Message
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_message (
                id SERIAL PRIMARY KEY,
                room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        console.log("Database schema verified.");
    } catch (err) {
        console.error("Schema init failed:", err.message);
        throw err;
    }
}
