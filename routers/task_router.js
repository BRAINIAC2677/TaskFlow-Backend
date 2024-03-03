import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import db from "../db.js";
import supabase from "../supabase.js";
import { get_user } from "./auth_router.js";

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/taskcover-upload",
  upload.single("taskcover"),
  async (req, res) => {
    if (!req.file) {
      res.status(500).json({ error: "No file uploaded" });
      return;
    }
    if (!req.body.task_id) {
      res.status(500).json({ error: "No task id provided" });
      return;
    }
    console.log(req.file);

    const { data: user_data, error: user_error } = await get_user(req);

    if (user_error || !user_data) {
      return res.status(500).json({ error: "Failed to retrieve user data" });
    }

    console.log("User data", user_data);
    console.log("user error", user_error);


    // todo: check if user has access to the task
    const task_id = req.body.task_id;
    let file_path = `${task_id}/${req.file.fieldname}`;

    const bucket_name = "task_files";
    const { data: upload_data, error: upload_error } = await supabase.storage
      .from(bucket_name)
      .upload(file_path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    console.log("upload_data", upload_data);
    console.log("upload_error", upload_error);

    if (upload_error) {
      return res
        .status(500)
        .json({ error: "Failed to upload file to Supabase Storage" });
    }
    console.log("upload_data", upload_data);

    const supabase_url = process.env.SUPABASEURL;
    const url = `${supabase_url}/storage/v1/object/public/${upload_data.fullPath}`;
    console.log("File uploaded successfully", url);

    try {
      const update_task_query = `
          UPDATE "Task"
          SET cover_url = $1
          WHERE id = $2
          RETURNING cover_url;
      `;
      const updated_task = await db.one(update_task_query, [url, task_id]);
      res.status(200).json({ url: updated_task.cover_url });
      console.log("Photo uploaded and URL updated successfully");
    } catch (db_error) {
      console.error(db_error);
      res
        .status(500)
        .json({ error: "Failed to update task with new photo URL" });
    }
  }
);

router.delete("/taskcover-delete", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }

  const user_id = data.user.id;
  //todo: check if user has access to the task
  const { task_id } = req.query;
  const bucket_name = "task_files";
  const file_path = `${task_id}/taskcover`;
  const { data: delete_data, error: delete_error } = await supabase.storage
    .from(bucket_name)
    .remove([file_path]);
  if (delete_error) {
    return res
      .status(500)
      .json({ error: "Failed to delete file from Supabase Storage" });
  }
  console.log("delete_data", delete_data);

  const query = `
  UPDATE "Task"
  SET cover_url = NULL
  WHERE id = $1;
  `;

  try {
    await db.any(query, [task_id]);
    res
      .status(200)
      .json({ success_msg: "Photo deleted and URL updated successfully" });
    console.log("Photo deleted and URL updated successfully");
  } catch (db_error) {
    console.error(db_error);
    res.status(500).json({ error: "Failed to update task with new photo URL" });
  }
});

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
  t.cover_url AS cover_url,
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
