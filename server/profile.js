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

export default profileRouter;