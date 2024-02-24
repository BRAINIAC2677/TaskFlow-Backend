SELECT
    u.id AS user_id,
    COUNT(DISTINCT t.id) FILTER (
        WHERE
            ta.task_id IS NOT NULL
    ) AS total_tasks,
    COUNT(
        DISTINCT CASE
            WHEN t.progress_rate >= 95
            AND ta.task_id IS NOT NULL THEN t.id
        END
    ) AS completed_tasks
FROM
    "UserProfile" u
    LEFT JOIN "TaskAccess" ta ON u.id = ta.user_id
    LEFT JOIN "Task" t ON t.id = ta.task_id
WHERE
    u.id = $1
GROUP BY
    u.id;