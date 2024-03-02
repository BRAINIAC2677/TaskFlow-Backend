import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import supabase from "../supabase.js";
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

  const query = `
    SELECT
    tb.id AS board_id,
    tb.name AS board_name,
    tb.due_timestamp,
    tb.description,
    COALESCE(AVG(t.progress_rate), 0) AS progress,
    'null' AS status,
    tbm.role,
    (
        SELECT
            JSON_BUILD_OBJECT('user_id', up.id, 'username', up.username) AS owner_info
        FROM
            "TaskBoardMember" tbm_owner
            JOIN "UserProfile" up ON up.id = tbm_owner.user_id
        WHERE
            tbm_owner.role = 1
            AND tbm_owner.board_id = tb.id
        LIMIT
            1
    ) AS owner_info
  FROM
    "TaskBoard" tb
    JOIN "TaskBoardMember" tbm ON tb.id = tbm.board_id
    LEFT JOIN "TaskList" l ON tb.id = l.board_id
    LEFT JOIN "Task" t ON l.id = t.list_id
  WHERE
    tbm.user_id = $1
  GROUP BY
    tb.id,
    tb.name,
    tb.due_timestamp,
    tb.description,
    tbm.role
  ORDER BY
    board_id;
    `;

  try {
    const data = await db.any(query, [user_id]);
    res.status(200).json(data);
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
    res.status(200).json({ board_id });

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
router.get("/get-content", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;
  const { board_id } = req.query;

  const query = `
  SELECT
    tb.id AS board_id,
    tb.name AS board_name,
    tb.due_timestamp AS board_deadline,
    tb.description AS board_description,
    tbm.role AS board_access,
    json_agg(
      json_build_object(
          'list_id', tl.id,
          'list_name', tl.name,
          'list_deadline', tl.due_timestamp,
          'list_tasks', (
            SELECT
              json_agg(
                json_build_object(
                  'task_id', t.id,
                  'task_name', t.name,
                  'task_deadline', t.due_timestamp,
                  'task_label_color', t.label_color,
                  'task_cover_url', t.cover_url
                )
              )
            FROM "Task" t
            WHERE t.list_id = tl.id
          )
      )
    ) AS board_lists,
    (SELECT json_agg(
        json_build_object(
            'user_id', tbm_inner.user_id,
            'username', u.username,
            'full_name', u.first_name || ' ' || u.middle_name || ' ' || u.last_name,
            'role', tbm_inner.role,
            'dp_url', u.dp_url
        )
      )
      FROM "TaskBoardMember" tbm_inner
      JOIN "UserProfile" u ON u.id = tbm_inner.user_id
      WHERE tbm_inner.board_id = tb.id
    ) AS board_members
  FROM
    "TaskBoard" tb
    JOIN "TaskList" tl ON tl.board_id = tb.id
    JOIN "TaskBoardMember" tbm ON tbm.board_id = tb.id
  WHERE
    tb.id = $1 AND tbm.user_id = $2
  GROUP BY
    tb.id,
    tb.name,
    tbm.role;
  `;

  try {
    const data = await db.any(query, [board_id, user_id]);
    res.status(200).json(data);
    console.log("Board content retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/update", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;
  const { board_id, board_name, board_deadline, board_description } = req.body;

  console.log("Board update for board_id: ", board_id);

  const query = `
    UPDATE "TaskBoard"
    SET name = $1, due_timestamp = $2, description = $3
    WHERE id = $4;
  `;

  try {
    await db.none(query, [
      board_name,
      board_deadline,
      board_description,
      board_id,
    ]);
    res.status(200).json({ message: "Board updated successfully" });
    console.log("Board updated successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/update-member-access", async (req, res) => {
  const { data, error } = await get_user(req);
  if (error) {
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;
  const { board_id, member_id, prev_role, new_role } = req.body;

  if (new_role === 1) {
    res.status(400).json({ error: "Owner role cannot be assigned" });
    return;
  }

  const query = `
    UPDATE "TaskBoardMember"
    SET role = $1
    WHERE board_id = $2 AND user_id = $3;
  `;

  try {
    await db.none(query, [new_role, board_id, member_id]);
    res.status(200).json({ message: "Member access updated successfully" });
    console.log("Member access updated successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
