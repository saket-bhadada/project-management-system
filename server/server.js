import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import passportRouter from "./passport.js";
// import homeRouter from "./home.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(bodyParser.json());
app.use(express.json());

app.use("/api", passportRouter);
// app.use("/home", homeRouter);
app.listen(3000,()=>{
    console.log('listening on port 3000');
})