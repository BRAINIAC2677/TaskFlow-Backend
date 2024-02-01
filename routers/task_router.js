import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import { get_user } from "./auth_router.js";

const router = express.Router();

dotenv.config();

router.post("/get-ranged-tasks", async (req, res) => {
  console.log("All tasks asked for calendar view page");
  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }

  const user_id = data.user.id;
  const { start, end } = req.body;

  console.log("Start: ", start, "End: ", end);

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
      AND (
        (a.start_timestamp >= $2 AND a.start_timestamp <= $3) OR
        (a.due_timestamp >= $2 AND a.due_timestamp <= $3)
      )
  `;

  try {
    const data = await db.any(query, [user_id, start, end]);
    res.json(data);
    console.log("All tasks retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/update-time", async (req, res) => {
  console.log("Task timeline update requested");
  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;
  const { request_id, id, start, end } = req.body;
  console.log(
    "request ID",
    request_id,
    "id",
    id,
    "Start: ",
    start,
    "End: ",
    end
  );

  const query = `
    UPDATE "Task"
    SET start_timestamp = $1, due_timestamp = $2
    WHERE id = $3
    RETURNING id;
  `;

  try {
    const data = await db.one(query, [start, end, id]);
    res.json({ id: data.id, request_id });
    console.log("Task timeline updated successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
