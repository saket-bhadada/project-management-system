import react,{useState} from "react";
import './profile.css';

export default function Profile(){

    async function home(){
        try{
            const response = await fetch('/api/profile',{
                method: 'POST'
            })
        }
        catch(err){
            console.log(err);
        }
    }
    return(
        <div className="profile-container">
            <div className="pic"></div>
            <div className="email"></div>
            <div className="type-of-user"></div>
            <div></div>
        </div>
    );
}   