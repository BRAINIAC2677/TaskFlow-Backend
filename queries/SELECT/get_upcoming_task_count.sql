SELECT
    COUNT(t.id) AS upcoming_tasks
FROM
    "Task" t
    JOIN "TaskAccess" ta ON t.id = ta.task_id
WHERE
    ta.user_id = $1
    AND t.due_timestamp >= DATE_TRUNC('week', CURRENT_DATE)
    AND t.due_timestamp < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'