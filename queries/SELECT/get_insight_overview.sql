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
    JOIN "TaskAssignment" ta ON t.id = ta.task_id
WHERE
    ta.user_id = '816cea00-f671-496f-ac80-c75ebbf1d85a'::uuid;

