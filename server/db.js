import pg from "pg";

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database:"PWS",
    password:"Saket2006",
    port:5432,
});

export default db;
