WITH date_series AS (
    SELECT
        generate_series(
            DATE_TRUNC(
                'week',
                (
                    SELECT
                        created_at
                    FROM
                        "UserProfile"
                    WHERE
                        id = '816cea00-f671-496f-ac80-c75ebbf1d85a' :: uuid
                )
            ),
            DATE_TRUNC('week', NOW()),
            '1 week' :: INTERVAL
        ) AS week_starting
),
completed_tasks AS (
    SELECT
        DATE_TRUNC('week', t.last_progressed) AS week_starting,
        COUNT(*) AS completed_task_count
    FROM
        "Task" t
        JOIN "TaskAssignment" ta ON t.id = ta.task_id
    WHERE
        ta.user_id = '816cea00-f671-496f-ac80-c75ebbf1d85a' :: uuid
        AND t.progress_rate >= 99
        AND t.last_progressed >= (
            SELECT
                created_at
            FROM
                "UserProfile"
            WHERE
                id = '816cea00-f671-496f-ac80-c75ebbf1d85a' :: uuid
        )
        AND t.last_progressed <= NOW()
    GROUP BY
        DATE_TRUNC('week', t.last_progressed)
)
SELECT
    TO_CHAR(ds.week_starting, 'YYYY') || ' ' || TO_CHAR(ds.week_starting, 'Mon') || ' W' || TO_CHAR(ds.week_starting, 'W') AS label,
    COALESCE(ct.completed_task_count, 0) AS completed_task_count
FROM
    date_series ds
    LEFT JOIN completed_tasks ct ON ds.week_starting = ct.week_starting
ORDER BY
    ds.week_starting;