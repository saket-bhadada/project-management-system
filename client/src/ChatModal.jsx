import React, { useEffect } from "react";

function chatmodule(){
    const [messages, setMessages] = useState([]);
    const [socket, setsocket] = useState(null);
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
    function submit(e){
        try{

        }catch(error){
            console.error("Error submitting message", error);
        }
    }
    useEffect(()=>{
        const newsocket = new WebSocket('ws://localhost:3001/chat');
        setsocket(newsocket);
        newsocket.onopen=()=>{
            console.log("connected");        
        };
        newsocket.onmessage = (event) => {
            // Ensure the message is received as a string
            const message = event.data.toString();
            setMessages((prevMessages) => [...prevMessages, message]);
        };
         newsocket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        newsocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            newsocket.close();
        };
    },[username]);
    return(
        <div className="container">
            <p>{user_id}</p>
            <input>message</input>
            <button >send</button>
        </div>
    );
}
export default chatmodule;