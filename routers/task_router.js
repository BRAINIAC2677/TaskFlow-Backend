import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import { get_user } from "./auth_router.js";

const router = express.Router();

dotenv.config();

router.get("/get-all", async (req, res) => {
  console.log("All tasks asked for calendar view page");
  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;

  const query = `
    SELECT
        a.id AS id,
        a.start_timestamp AS start,
        a.due_timestamp AS end,
        a.name AS title,
        a.label_color AS backgroundColor,
        CASE
            WHEN b.access <= 2 THEN true
            WHEN b.access > 2 THEN false
        END editable
    FROM
        "Task" a,
        "TaskAccess" b,
        "TaskBoardMember" c
    WHERE
        a.id = b.task_id
        AND b.member_id = c.id
        and c.user_id = $1
      `;

  try {
    const data = await db.any(query, [user_id]);
    res.json(data);
    console.log("All tasks retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
