import express from "express";
// import express from "express-session";

const profileRouter = express.Router();

profileRouter.get("/profile",async(req,res)=>{
    if(req.isAuthenticated()){
        res.json({user:req.user});
    }else{
        res.redirect("/login");
    }
});
profileRouter.post("/messages",async(req,res)=>{
    const msg = req.body;
    const data = await db.query();
    res.json({msg});
});
profileRouter.delete("/messages/:id",async(req,res)=>{});

export default profileRouter;