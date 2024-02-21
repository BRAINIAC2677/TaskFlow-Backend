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
      "TaskAssignment" b
    WHERE
      a.id = b.task_id
      AND b.user_id = $1
      AND (
        (a.start_timestamp >= $2 AND a.start_timestamp <= $3) OR
        (a.due_timestamp >= $2 AND a.due_timestamp <= $3)
      )
  `;

  try {
    const data = await db.any(query, [user_id, start, end]);
    res.status(200).json(data);
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
    res.status(200).json({
      id: data.id,
      request_id,
    });
    console.log("Task timeline updated successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/dashboard-stuff", async (req, res) => {
  console.log("Dashboard stuff requested");
  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;

  // Get total tasks, completed tasks
  const query1 = `
  SELECT
    u.id AS user_id,
    COUNT(DISTINCT t.id) FILTER (WHERE ta.task_id IS NOT NULL) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.progress_rate >= 95 AND ta.task_id IS NOT NULL THEN t.id END) AS completed_tasks
  FROM
    "UserProfile" u
    LEFT JOIN "TaskAssignment" ta ON u.id = ta.user_id
    LEFT JOIN "Task" t ON t.id = ta.task_id
  WHERE u.id = $1
  GROUP BY
    u.id;
  `;

  // Get active board count
  const query2 = `
  SELECT 
    COUNT(DISTINCT(tb.id)) AS active_board_count
  FROM
    "TaskBoard" tb
  JOIN
    "TaskBoardMember" tbm ON tb.id = tbm.board_id
  JOIN
    "TaskList" tl ON tb.id = tl.board_id
  JOIN
    "Task" t ON tl.id = t.list_id
  JOIN
    "TaskChecklistItem" tci ON t.id = tci.task_id
  WHERE
    tci.last_updated > CURRENT_DATE - INTERVAL '7 days'
    AND tbm.user_id = $1;
  `;

  // upcoming task deadlines this week
  const query3 = `
  SELECT
    COUNT(t.id) AS upcoming_tasks
  FROM
    "Task" t
    JOIN "TaskAssignment" ta ON t.id = ta.task_id
  WHERE
    ta.user_id = $1
    AND t.due_timestamp >= DATE_TRUNC('week', CURRENT_DATE)
    AND t.due_timestamp < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week';
  `;

  try {
    const data1 = await db.one(query1, [user_id]);
    let total_tasks = data1.total_tasks;
    let completed_tasks = data1.completed_tasks;

    const data2 = await db.one(query2, [user_id]);
    let active_board_count = data2.active_board_count;

    const data3 = await db.one(query3, [user_id]);
    let upcoming_tasks = data3.upcoming_tasks;

    console.log(
      active_board_count,
      total_tasks,
      completed_tasks,
      upcoming_tasks
    );

    res.status(200).json({
      total_tasks,
      completed_tasks,
      active_board_count,
      upcoming_tasks,
    });
    console.log("Dashboard stuff retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
