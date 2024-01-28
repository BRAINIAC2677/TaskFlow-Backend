import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import { get_user } from "./auth_router.js";

const router = express.Router();

dotenv.config();

router.get("/get-all", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;
  console.log("user_id", user_id);

  const query = `
    SELECT
    a.id AS board_id,
    a.name AS board_name,
    a.due_timestamp,
    a.description,
    random() * 101 AS progress,
    'null' AS status,
    b.role,
    (
        SELECT
            JSON_BUILD_OBJECT('user_id', d.id, 'username', d.username) AS owner_info
        FROM
            "TaskBoardMember" c
            JOIN "UserProfile" d ON d.id = c.user_id
        WHERE
            c.role = 1
            AND c.board_id = a.id
        LIMIT
            1
    ) AS owner_info
  FROM
    "TaskBoard" a
    JOIN "TaskBoardMember" b ON a.id = b.board_id
  WHERE
    b.user_id = $1
  ORDER BY
    board_id;
    `;

  try {
    const data = await db.any(query, [user_id]);
    res.json(data);
    console.log("All boards retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/create", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;
  console.log(req.body);
  const { board_name, board_deadline, board_description, board_members } =
    req.body;

  const query_1 = `
    INSERT INTO "TaskBoard" (name, due_timestamp, description)
    VALUES ($1, $2, $3)
    RETURNING id;
  `;

  try {
    const data = await db.one(query_1, [
      board_name,
      board_deadline,
      board_description,
    ]);
    const board_id = data.id;
    res.json({ board_id });

    // adding the creator as owner of the board
    const query_2 = `
      INSERT INTO "TaskBoardMember" (user_id, board_id, role)
      VALUES ($1, $2, 1);
    `;
    await db.none(query_2, [user_id, board_id]);

    // adding the members
    const query_3 = `
      INSERT INTO "TaskBoardMember" (user_id, board_id, role)
      VALUES ($1, $2, $3);
    `;
    board_members.forEach(async (member) => {
      await db.none(query_3, [member.user_id, board_id, member.role]);
    });

    console.log("Board created and members added successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// using board_id as a route parameter
router.get("/get-content/:board_id", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;
  const board_id = req.params.board_id;

  console.log("user_id", user_id, "board_id", board_id);

  const query = `
  SELECT
  tb.id AS board_id,
  tb.name AS board_name,
  json_agg(
      json_build_object(
          'list_id',
          tl.id,
          'list_name',
          tl.name,
          'list_tasks',
          (
              SELECT
                  json_agg(
                      json_build_object(
                          'task_id',
                          t.id,
                          'task_name',
                          t.name,
                          'task_deadline',
                          t.due_timestamp,
                          'task_label_color',
                          t.label_color
                      )
                  )
              FROM
                  "Task" t
              WHERE
                  t.list_id = tl.id
          )
          )
      ) AS board_lists
    FROM
      "TaskBoard" tb
      JOIN "TaskList" tl ON tl.board_id = tb.id
    WHERE
      tb.id = $1
    GROUP BY
      tb.id,
      tb.name;
    `;

  try {
    const data = await db.any(query, [board_id]);
    res.json(data);
    console.log("Board content retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
