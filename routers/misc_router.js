import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import { get_user } from "./auth_router.js";

const router = express.Router();

dotenv.config();

router.post("/feedback", async (req, res) => {
  const { email, subject, message } = req.body;

  const query = `
    INSERT INTO "UserFeedback" (email, subject, message)
    VALUES ($1, $2, $3)
  `;

  try {
    await db.none(query, [email, subject, message]);
    res.status(200).json({ message: "Feedback submitted" });
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
