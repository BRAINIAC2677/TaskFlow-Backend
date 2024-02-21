// import express from "express";
// import OpenAI from "openai";
// import dotenv from "dotenv";
// import db from "../db.js";

const express = require('express');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const db = require('../db.js');

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const openai_id = "e469e213-b6f2-424e-b6a9-af3f8d2f25d5";
const openai_username = "OpenAI";

async function create_taskmessage(_task_id, _sender_id, _body, _file_url, _sender_username) {
  const query = `
    INSERT INTO "TaskMessage" (task_id, sender_id, body, file_url, sender_username)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
    `;
  try {
    const data = await db.one(query, [
      _task_id,
      _sender_id,
      _body,
      _file_url,
      _sender_username,
    ]);
    const status = 200;
    const res_body = data;
    return { status, res_body };
  } catch (error) {
    const status = 500;
    const res_body = { error: "Internal Server Error" };
    return { status, res_body };
  }
}



router.get("/task-chat", async (req, res) => {
  console.log("AI chat requested");
  const { task_id } = req.query;
  console.log("Task ID", task_id);
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
        role: message.sender_id === openai_id ? "assistant" : "user",
        content: message.body,
      };
    });
    messages.reverse(); // keeping the most recent message at the end
    console.log("Messages", messages);
    const completion = await openai.chat.completions.create({
      messages: messages,
      model: "gpt-3.5-turbo",
    });
    console.log("completion", completion);
    console.log("AI chat completed successfully");
    const { status, res_body } = await create_taskmessage(task_id, openai_id, completion.choices[0].message.content, "", openai_username);
    console.log(status, res_body);
    if (status == 200) {
      res.status(200).json(completion.choices[0].message);
    }
    else {
      res.status(500).json({ error: "Internal Server Error in saving ai response." });
    }
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// export default router;
module.exports = router;
