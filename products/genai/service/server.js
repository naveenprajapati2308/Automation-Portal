import express from 'express';
import cors from 'cors';
import { generate } from './app.js';
import { requireAuth } from './auth.js';

const app=express();
const PORT=3000;

// Same origins automation-portal's own SecurityConfig CORS bean already allows — the gateway
// is what actually fronts this in a real deployment, but direct-port access (dev/testing)
// still needs a real allow-list instead of reflecting every origin.
const ALLOWED_ORIGINS = [
    'http://localhost:15000',
    'http://localhost:5173',
    'http://localhost:5170',
    'http://localhost:15173',
    'http://localhost:3000'
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json())


app.get('/', (req,res)=>{
    res.send("Welcome to ChatBoot")
}
)

app.post('/chat', requireAuth, async (req, res)=>{
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