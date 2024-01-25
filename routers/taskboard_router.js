import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import { get_user } from "./auth_router.js";

const router = express.Router();

dotenv.config();

router.get("/get-all", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;
  console.log("user_id", user_id);

  const query = `
      SELECT b.name, b.due_timestamp, b.description
      FROM "TaskBoardMember" a, "TaskBoard" b
      WHERE a.user_id = $1 AND a.board_id = b.id
    `;

  try {
    const data = await db.any(query, [user_id]);
    res.json(data);
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
