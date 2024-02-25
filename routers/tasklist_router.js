import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import { get_user } from "./auth_router.js";

const router = express.Router();

dotenv.config();

router.post("/create", async (req, res) => {
  const { error } = await get_user(req);
  if (error) {
    res.status(500).json({ error });
    return;
  }
  const { board_id, list_name, list_description, list_deadline } = req.body;

  const query = `
    INSERT INTO "TaskList" (board_id, name, description, due_timestamp)
    VALUES ($1, $2, $3, $4)
    RETURNING id;
  `;

  try {
    const data = await db.one(query, [
      board_id,
      list_name,
      list_description,
      list_deadline,
    ]);
    res.status(200).json(data);
    console.log("List created successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
