import express from "express";
import dotenv from "dotenv";
import db from "../db.js";
import { get_user } from "./auth_router.js";

const router = express.Router();

dotenv.config();

router.get("/dashboard-summary", async (req, res) => {
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
      LEFT JOIN "TaskAccess" ta ON u.id = ta.user_id
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
  WHERE
    t.last_progressed > CURRENT_DATE - INTERVAL '7 days'
    AND tbm.user_id = $1;
    `;

  // upcoming task deadlines this week
  const query3 = `
    SELECT
      COUNT(t.id) AS upcoming_tasks
    FROM
      "Task" t
      JOIN "TaskAccess" ta ON t.id = ta.task_id
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

router.get("/task-completion", async (req, res) => {
  console.log("Task completion Info requested");
  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;

  // Tasks due today, this week, this month
  const query1 = `
    SELECT
    COUNT(DISTINCT CASE WHEN t.due_timestamp::date = CURRENT_DATE THEN
            t.id
        END) AS todayTaskDue,
    COUNT(DISTINCT CASE WHEN t.due_timestamp::date >= DATE_TRUNC('week', CURRENT_DATE)
            AND t.due_timestamp::date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week' THEN
            t.id
        END) AS thisWeekTaskDue,
    COUNT(DISTINCT CASE WHEN t.due_timestamp::date >= DATE_TRUNC('month', CURRENT_DATE)
            AND t.due_timestamp::date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' THEN
            t.id
        END) AS thisMonthTaskDue
    FROM
    "Task" t
    JOIN "TaskAccess" ta ON t.id = ta.task_id
    WHERE
    ta.user_id = $1
  `;

  // Tasks overdue today, this week, this month
  const query2 = `
        SELECT
        COUNT(DISTINCT CASE WHEN t.progress_rate < 99
                AND t.due_timestamp < NOW()
                AND t.due_timestamp::date = CURRENT_DATE THEN
                t.id
            END) AS todayTaskOverdue,
        COUNT(DISTINCT CASE WHEN t.progress_rate < 99
                AND t.due_timestamp < NOW()
                AND t.due_timestamp::date >= DATE_TRUNC('week', CURRENT_DATE) THEN
                t.id
            END) AS thisWeekTaskOverdue,
        COUNT(DISTINCT CASE WHEN t.progress_rate < 99
                AND t.due_timestamp < NOW()
                AND t.due_timestamp::date >= DATE_TRUNC('month', CURRENT_DATE) THEN
                t.id
            END) AS thisMonthTaskOverdue
        FROM
            "Task" t
            JOIN "TaskAccess" ta ON t.id = ta.task_id
        WHERE
            ta.user_id = $1
    `;

  // Tasks completed today, this week, this month
  const query3 = `
    SELECT
    COUNT(
        CASE WHEN t.last_progressed::date = CURRENT_DATE
            AND t.progress_rate >= 99 THEN
            1
        END) AS task_completed_today,
    COUNT(
        CASE WHEN t.progress_rate >= 99
            AND t.last_progressed::date >= DATE_TRUNC('week', CURRENT_DATE) THEN
            1
        END) AS task_completed_this_week,
    COUNT(
        CASE WHEN t.progress_rate >= 99
            AND t.last_progressed::date >= DATE_TRUNC('month', CURRENT_DATE) THEN
            1
        END) AS task_completed_this_month
    FROM
      "Task" t
      JOIN "TaskAccess" ta ON t.id = ta.task_id
    WHERE
      ta.user_id = $1;
    `;

  try {
    const data1 = await db.one(query1, [user_id]);
    let todayTaskDue = data1.todaytaskdue;
    let thisWeekTaskDue = data1.thisweektaskdue;
    let thisMonthTaskDue = data1.thismonthtaskdue;

    const data2 = await db.one(query2, [user_id]);
    let todayTaskOverdue = data2.todaytaskoverdue;
    let thisWeekTaskOverdue = data2.thisweektaskoverdue;
    let thisMonthTaskOverdue = data2.thismonthtaskoverdue;

    const data3 = await db.one(query3, [user_id]);
    let todayTaskCompleted = data3.task_completed_today;
    let thisWeekTaskCompleted = data3.task_completed_this_week;
    let thisMonthTaskCompleted = data3.task_completed_this_month;

    console.log(
      todayTaskDue,
      thisWeekTaskDue,
      thisMonthTaskDue,
      todayTaskOverdue,
      thisWeekTaskOverdue,
      thisMonthTaskOverdue,
      todayTaskCompleted,
      thisWeekTaskCompleted,
      thisMonthTaskCompleted
    );

    res.status(200).json({
      today_task_due: todayTaskDue,
      this_week_task_due: thisWeekTaskDue,
      this_month_task_due: thisMonthTaskDue,
      today_task_overdue: todayTaskOverdue,
      this_week_task_overdue: thisWeekTaskOverdue,
      this_month_task_overdue: thisMonthTaskOverdue,
      today_task_completed: todayTaskCompleted,
      this_week_task_completed: thisWeekTaskCompleted,
      this_month_task_completed: thisMonthTaskCompleted,
    });

    console.log("Task completion info retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/weekly-task-completion", async (req, res) => {
  console.log("Weekly task completion requested");
  let { start_date, end_date } = req.query;

  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;

  const get_user_creation_date = async (user_id) => {
    const query = `
      SELECT
          created_at
      FROM
          "UserProfile"
      WHERE
          id = $1;
      `;
    try {
      const data = await db.one(query, [user_id]);
      return data.created_at;
    } catch (error) {
      console.error("Error: ", error);
      return new Date().toISOString();
    }
  };

  start_date =
    start_date === "-1"
      ? await get_user_creation_date(user_id)
      : new Date(start_date).toISOString();

  end_date =
    end_date === "-1"
      ? new Date().toISOString()
      : new Date(end_date).toISOString();

  const query = `
      WITH date_series AS (
        SELECT generate_series(
          DATE_TRUNC('week', $1::timestamp with time zone),
          DATE_TRUNC('week', $2::timestamp with time zone),
          '1 week'::interval
        ) AS week_starting
      ),
      completed_tasks AS (
        SELECT DATE_TRUNC('week', t.last_progressed) AS week_starting,
        COUNT(*) AS completed_task_count
        FROM "Task" t
        JOIN "TaskAccess" ta ON t.id = ta.task_id
        WHERE ta.user_id = $3
        AND t.progress_rate >= 99
        AND t.last_progressed BETWEEN $1 AND $2
        GROUP BY week_starting
      )
      SELECT ds.week_starting AS start_date,
        COALESCE(ct.completed_task_count, 0) AS done
      FROM date_series ds
      LEFT JOIN completed_tasks ct ON ds.week_starting = ct.week_starting
      ORDER BY ds.week_starting;
    `;

  try {
    const weekly_data = await db.any(query, [start_date, end_date, user_id]);
    res.status(200).json(weekly_data);
    console.log("Weekly task completion stats retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/daily-task-completion", async (req, res) => {
  console.log("Daily task completion requested");
  let { start_date, end_date } = req.query;

  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;

  // Get the user's account creation date
  const get_user_creation_date = async (user_id) => {
    const query = `
      SELECT
          created_at
      FROM
          "UserProfile"
      WHERE
          id = $1;
      `;
    try {
      const data = await db.one(query, [user_id]);
      return data.created_at;
    } catch (error) {
      console.error("Error: ", error);
      return new Date().toISOString();
    }
  };
  let userCreationDate = await get_user_creation_date(user_id);

  start_date = start_date === "-1" ? userCreationDate : start_date;
  end_date = end_date === "-1" ? new Date().toISOString() : end_date;

  const query = `
  WITH date_series AS (
    SELECT generate_series(
      DATE_TRUNC('day', $1::timestamp with time zone),
      DATE_TRUNC('day', $2::timestamp with time zone),
      '1 day'::interval
    ) AS day
  ),
  completed_tasks AS (
    SELECT
      t.last_progressed::date AS completed_day,
      COUNT(*) AS completed_task_count
    FROM
      "Task" t
      JOIN "TaskAccess" ta ON t.id = ta.task_id
    WHERE
      ta.user_id = $3
      AND t.progress_rate >= 99
      AND t.last_progressed::date BETWEEN $1 AND $2
    GROUP BY
      completed_day
  )
  SELECT ds.day AS date,
    COALESCE(ct.completed_task_count, 0) AS done
  FROM date_series ds
  LEFT JOIN completed_tasks ct ON ds.day = ct.completed_day
  ORDER BY ds.day;
  `;

  try {
    const data = await db.any(query, [start_date, end_date, user_id]);
    res.status(200).json(data);
    console.log("Daily task completion stats retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/task-progression", async (req, res) => {
  console.log("Task progression requested");

  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;

  const query = `
    WITH progress_ranges AS (
      SELECT generate_series(0, 90, 10) AS progress_min,
            generate_series(10, 100, 10) AS progress_max
    ),
    user_tasks AS (
      SELECT t.id, t.progress_rate
      FROM "Task" t
      JOIN "TaskAccess" ta ON t.id = ta.task_id
      WHERE ta.user_id = $1
    ),
    epsilon AS (
      SELECT 0.0001 AS value -- Epsilon value to avoid overlap
    )
    SELECT 
      pr.progress_min || '-' || pr.progress_max || '%' AS progress_range,
      COUNT(ut.id) AS task_count
    FROM 
      progress_ranges pr
    LEFT JOIN user_tasks ut ON 
      ut.progress_rate >= pr.progress_min AND 
      (ut.progress_rate < pr.progress_max OR (pr.progress_max = 100 AND ut.progress_rate <= pr.progress_max))
    GROUP BY pr.progress_min, pr.progress_max
    ORDER BY pr.progress_min;
  `;

  try {
    const data = await db.any(query, [user_id]);
    res.status(200).json(data);
    console.log("Task progression stats retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/get-board-ranges", async (req, res) => {
  console.log("Board ranges requested");

  const { data, error } = await get_user(req);
  if (error) {
    console.error("Error: ", error);
    res.status(500).json({ error });
    return;
  }
  const user_id = data.user.id;

  const query = `
    SELECT b.id, b.name, b.created_at AS start_time, b.due_timestamp AS end_time
    FROM "TaskBoard" b JOIN "TaskBoardMember" bm ON b.id = bm.board_id
    WHERE bm.user_id = $1
    ORDER BY b.created_at DESC;
  `;

  try {
    const data = await db.any(query, [user_id]);
    res.status(200).json(data);
    console.log("Board ranges retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
