import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import { get_user } from "./auth_router.js";

const router = express.Router();

dotenv.config();

router.get("/retrieve", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }

  const user_id = data.user.id;
  const { count, offset } = req.query;

  const query = `
    SELECT
      n.id AS id,
      n.body AS body,
      n.created_at AS timestamp,
      un.is_checked AS read,
      n.url_1 AS url_1,
      n.url_2 AS url_2
    FROM
      "Notification" n JOIN 
      "UserNotification" un 
      ON n.id = un.notification_id
    WHERE
      un.user_id = $1
    ORDER BY n.created_at DESC
    LIMIT $2
    OFFSET $3
  `;

  try {
    const data = await db.any(query, [user_id, count, offset]);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;