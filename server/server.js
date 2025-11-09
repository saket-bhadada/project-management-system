import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import passportRouter from "./passport.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/api", passportRouter);

app.listen(3000,()=>{
    console.log('listining on port 3000');
})