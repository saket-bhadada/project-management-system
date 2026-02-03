import React from "react";

function chat(){

    async function LoadMessage(){
        try{
            const response = await fetch(`/api/chat/${userid}`);
            
        }catch(error){
            console.error("Error loading messages", error);
            // setmessages([]);
        }
    }
    async function loadmessages(){
        try{
            const response = await fetch(`\api\chat${userid}`);
        }
        catch(err){
            console.error("Error loading messages", err);
            setmessages([]);
        }
    }
    function user_id(){
        const handleclick = (event)=>{
            const clickid = event.target.id;
            console.log(clickid);
        }
    }
    return(
        <div className="container">
            
        </div>
    );
}