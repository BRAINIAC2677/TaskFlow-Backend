-- Task Due Today, This Week, This Month
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
    ta.user_id = '816cea00-f671-496f-ac80-c75ebbf1d85a'::uuid;

-- Task Overdue Today, This Week, This Month
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
    ta.user_id = '816cea00-f671-496f-ac80-c75ebbf1d85a'::uuid;

-- Task Completed Today, This Week, This Month
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

