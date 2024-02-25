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
      "TaskAccess" b
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

router.get("/get-detail", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;
  const { task_id } = req.query;

  const query = `
  SELECT
  t.id,
  t.name,
  t.description,
  t.start_timestamp AS start_time,
  t.due_timestamp AS due_time,
  (
      SELECT
          JSON_AGG(
              JSON_BUILD_OBJECT('label_id', l.id, 'label_name', l.name)
          )
      FROM
          "Label" l
          JOIN "TaskLabel" tl ON tl.label_id = l.id
      WHERE
          tl.task_id = t.id
  ) AS labels,
  (
      SELECT
          JSON_AGG(
              JSON_BUILD_OBJECT(
                  'item_id',
                  tcli.id,
                  'item_name',
                  tcli.name,
                  'is_completed',
                  tcli.is_completed
              )
          )
      FROM
          "TaskChecklistItem" tcli
      WHERE
          tcli.task_id = t.id
  ) AS checklist_items,
  t.label_color,
  (
      SELECT
          access
      FROM
          "TaskAccess"
      WHERE
          task_id = t.id
          AND user_id = $1
  )
FROM
  "Task" t
WHERE
  t.id = $2;
  `;

  try {
    const data = await db.one(query, [user_id, task_id]);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
