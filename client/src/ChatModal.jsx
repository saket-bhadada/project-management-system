import React,{useState} from "react";

function chatmodule(){
    async function loadMessages(){
        try{
            const response = await fetch(`/api/user/{userId}`);
            
        }catch(err){
            return console.error("Error loading messages",err);
        }
    }
}

export default chatmodule;