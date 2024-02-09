import express from 'express';
import OpenAI from "openai";
import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_brain });

router.get('/task-chat', async (req, res) => {
    console.log('AI chat requested');
    const { task_id } = req.query;
    console.log('Task ID', task_id);
    // todo: validate whether the user has access to the task
    const query = `
    SELECT sender_id, body
    FROM "TaskMessage"
    WHERE task_id = $1
    ORDER BY created_at DESC
    LIMIT 10;
    `;
    try {
        const data = await db.any(query, [task_id]);
        const messages = data.map((message) => {
            return {
                role: message.sender_id === 1 ? 'assistant' : 'user',
                content: message.body
            };
        });
        console.log('Messages', messages);
        const completion = await openai.chat.completions.create({
            messages: messages,
            model: "gpt-3.5-turbo",
        });
        console.log("completion", completion);
        res.json(completion.choices[0].message);
        console.log('AI chat completed successfully');
    } catch (error) {
        console.error('Error: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;


