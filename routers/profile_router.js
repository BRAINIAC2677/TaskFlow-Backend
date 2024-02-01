import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import { get_user } from "./auth_router.js";

const router = express.Router();

dotenv.config();

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
    res.json(data);
    console.log("Usernames retrieved successfully");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
