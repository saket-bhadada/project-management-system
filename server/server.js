import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/",(req,res)=>{
    res.send("hello world");
    res.json();
})

app.listen(3000,()=>{
    console.log('listining on port 3000');
})