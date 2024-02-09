import express from 'express';
import db from '../db.js';
import { get_user } from './auth_router.js';

const router = express.Router();

router.post('/create', async (req, res) => {
    console.log('Task message creation requested');
    const { data, error } = await get_user(req);
    if (error) {
        console.error('Error: ', error);
        res.status(500).json({ error });
        return;
    }
    const sender_id = data.user.id;
    let sender_username = '';
    let query = `
    SELECT username FROM "UserProfile"
    WHERE id = $1;
    `;
    try {
        const data = await db.one(query, [sender_id]);
        sender_username = data.username;
        console.log('Sender username', sender_username);
    } catch (error) {
        console.error('Error: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }

    const { task_id, body, file_url } = req.body;
    console.log('Task ID', task_id, 'Body', body, 'File URL', file_url);
    // todo: validate whether the user has access to the task
    query = `
    INSERT INTO "TaskMessage" (task_id, sender_id, body, file_url, sender_username)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
    `;
    try {
        const data = await db.one(query, [task_id, sender_id, body, file_url, sender_username]);
        res.json(data);
        console.log('Task message created successfully');
    } catch (error) {
        console.error('Error: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/retrieve-all', async (req, res) => {
    console.log('All task messages retrieval requested');
    const { task_id } = req.query;
    console.log('Task ID', task_id);
    // todo: validate whether the user has access to the task
    const query = `
    SELECT * FROM "TaskMessage"
    WHERE task_id = $1;
    `;
    try {
        const data = await db.any(query, [task_id]);
        res.json(data);
        console.log('All task messages retrieved successfully');
    } catch (error) {
        console.error('Error: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/update', async (req, res) => {
    console.log('Task message update requested');
    const { message_id, body, file_url } = req.body;
    console.log('Message ID', message_id, 'Body', body, 'File URL', file_url);
    // todo: validate whether the user is the sender of the message
    const query = `
    UPDATE "TaskMessage"
    SET body = $1, file_url = $2
    WHERE id = $3
    RETURNING id;
    `;
    try {
        const data = await db.one(query, [body, file_url, message_id]);
        res.json(data);
        console.log('Task message updated successfully');
    } catch (error) {
        console.error('Error: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.delete('/delete', async (req, res) => {
    console.log('Task message deletion requested');
    const { message_id } = req.body;
    console.log('Message ID', message_id);
    // todo: validate whether the user is the sender of the message
    const query = `
    DELETE FROM "TaskMessage"
    WHERE id = $1
    RETURNING id;
    `;
    try {
        const data = await db.one(query, [message_id]);
        res.json(data);
        console.log('Task message deleted successfully');
    } catch (error) {
        console.error('Error: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;