// import express from "express";
// import dotenv from "dotenv";
// import db from "../db.js";
// import { get_user } from "./auth_router.js";

const express = require("express");
const dotenv = require("dotenv");
const db = require("../db.js");
const { get_user } = require("./auth_router.js");

const router = express.Router();

dotenv.config();

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

router.get("/overview", async (req, res) => {
  console.log("Overview requested");
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
    JOIN "TaskAssignment" ta ON t.id = ta.task_id
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
            JOIN "TaskAssignment" ta ON t.id = ta.task_id
        WHERE
            ta.user_id = $1
    `;

  // Tasks completed today, this week, this month
  const query3 = `
    WITH LatestUpdate AS (
        SELECT
            tcli.task_id,
            MAX(tcli.last_updated) AS max_last_updated
        FROM
            "TaskChecklistItem" tcli
        GROUP BY
            tcli.task_id
    ),
    TaskWithLatestUpdate AS (
        SELECT
            t.id,
            t.progress_rate,
            lu.max_last_updated
        FROM
            "Task" t
            LEFT JOIN LatestUpdate lu ON t.id = lu.task_id
    )
    SELECT
        COALESCE(COUNT(DISTINCT CASE WHEN twlu.progress_rate >= 99
                    AND twlu.max_last_updated >= DATE_TRUNC('day', CURRENT_DATE) THEN
                    twlu.id
                END), 0) AS today_task_count,
        COALESCE(COUNT(DISTINCT CASE WHEN twlu.progress_rate >= 99
                    AND twlu.max_last_updated >= DATE_TRUNC('week', CURRENT_DATE) THEN
                    twlu.id
                END), 0) AS this_week_task_count,
        COALESCE(COUNT(DISTINCT CASE WHEN twlu.progress_rate >= 99
                    AND twlu.max_last_updated >= DATE_TRUNC('month', CURRENT_DATE) THEN
                    twlu.id
                END), 0) AS this_month_task_count
    FROM
        "TaskAssignment" ta
    JOIN TaskWithLatestUpdate twlu ON ta.task_id = twlu.id
    WHERE
        ta.user_id = '816cea00-f671-496f-ac80-c75ebbf1d85a'::uuid;
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
    let todayTaskCompleted = data3.today_task_count;
    let thisWeekTaskCompleted = data3.this_week_task_count;
    let thisMonthTaskCompleted = data3.this_month_task_count;

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

    console.log("Overview retrieved successfully");
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// export default router;
module.exports = router;
