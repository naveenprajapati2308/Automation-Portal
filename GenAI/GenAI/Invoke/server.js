import express from 'express';
import cors from 'cors';
import { generate } from './app.js';

const app=express();
const PORT=3000;

app.use(cors());
app.use(express.json())


app.get('/', (req,res)=>{
    res.send("Welcome to ChatBoot")
}
)

app.post('/chat', async (req, res)=>{
    const {message, userId}= req.body; // 1. Use 'userId' to match the frontend key

    if(!message || !userId){ // 2. Fixed references (message and userId)
        return res.status(400).json({message:"Message and User id required"}); // 3. Added 'return' to halt execution
    }

    console.log("Message ", message);

    const result= await generate(message, userId);
    res.status(200).json({message:result})
});


app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})