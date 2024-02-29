import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import db from "../db.js";
import supabase from "../supabase.js";
import { get_user } from "./auth_router.js";

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/get-usernames", async (req, res) => {
  const { term, count } = req.body;
  const query = `
        SELECT
          id,
          username,
          first_name || ' ' || middle_name || ' ' || last_name AS full_name, 
          dp_url
        FROM
            "UserProfile"
        WHERE
            username ILIKE '%' || $1 || '%'
        ORDER BY
            CASE
                WHEN username = $1 THEN 1  -- Exact match has the highest priority
                WHEN username ILIKE $1 || '%' THEN 2  -- Starts with query_term
                WHEN username ILIKE '%' || $1 THEN 3  -- Ends with query_term
                ELSE 4  -- Contains query_term
            END,
            username  -- Order alphabetically as a secondary criteria
        LIMIT $2;    
        `;
  try {
    const data = await db.any(query, [term, count]);
    res.status(200).json(data);
    console.log("Usernames retrieved successfully");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/update", async (req, res) => {
  console.log(req.body);

  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }

  const user_id = data.user.id;
  const { first_name, middle_name, last_name, username } = req.body;

  const query = `
    UPDATE
      "UserProfile"
    SET
      first_name = $1,
      middle_name = $2,
      last_name = $3,
      username = $4
    WHERE
      id = $5
    RETURNING
      id,
      first_name,
      middle_name,
      last_name,
      username
    `;
  try {
    const data = await db.one(query, [
      first_name,
      middle_name,
      last_name,
      username,
      user_id,
    ]);
    res.status(200).json(data);
    console.log("Profile updated successfully");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post('/dp-delete', async (req, res) => {
  const { data: user_data, error: user_error } = await get_user(req);
  if (user_error || !user_data) {
    return res.status(500).json({ error: "Failed to retrieve user data" });
  }

  const user_id = user_data.user.id;
  const bucket_name = 'user_public_files';
  const file_path = `${user_id}/dp`;
  const { data: delete_data, error: delete_error } = await supabase.storage.from(bucket_name).remove([file_path]);
  if (delete_error) {
    return res.status(500).json({ error: 'Failed to delete file from Supabase Storage' });
  }
  console.log("delete_data", delete_data);
  try {
    const update_user_query = `
          UPDATE "UserProfile"
          SET dp_url = $1
          WHERE id = $2
          RETURNING dp_url;
      `;
    const fallback_dp_url = "https://ewpdvixqmeqmsvkuctat.supabase.co/storage/v1/object/public/user_public_files/fallback.png";
    const updated_user = await db.one(update_user_query, [fallback_dp_url, user_id]);
    res.status(200).json({ url: updated_user.dp_url });
    console.log("Photo deleted and URL updated successfully");
  } catch (db_error) {
    console.error(db_error);
    res.status(500).json({ error: "Failed to update user profile with new photo URL" });
  }
});


router.post('/dp-upload', upload.single('dp'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  console.log("req.file", req.file);

  const { data: user_data, error: user_error } = await get_user(req);
  if (user_error || !user_data) {
    return res.status(500).json({ error: "Failed to retrieve user data" });
  }

  const user_id = user_data.user.id;
  let file_path = `${user_id}/${req.file.fieldname}`;

  const bucket_name = 'user_public_files';
  const { data: upload_data, error: upload_error } = await supabase.storage.from(bucket_name).upload(file_path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: true,
  });

  if (upload_error) {
    return res.status(500).json({ error: 'Failed to upload file to Supabase Storage' });
  }
  console.log("upload_data", upload_data)

  const supabase_url = process.env.SUPABASEURL;
  const url = `${supabase_url}/storage/v1/object/public/${upload_data.fullPath}`;
  console.log("File uploaded successfully", url);

  try {
    const update_user_query = `
          UPDATE "UserProfile"
          SET dp_url = $1
          WHERE id = $2
          RETURNING dp_url;
      `;
    const updated_user = await db.one(update_user_query, [url, user_id]);
    res.status(200).json({ url: updated_user.dp_url });
    console.log("Photo uploaded and URL updated successfully");
  } catch (db_error) {
    console.error(db_error);
    res.status(500).json({ error: "Failed to update user profile with new photo URL" });
  }
});

export default router;
