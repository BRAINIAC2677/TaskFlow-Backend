WITH progress_ranges AS (
    SELECT
        generate_series(0, 90, 10) AS progress_min,
        generate_series(10, 100, 10) AS progress_max
),
user_tasks AS (
    SELECT
        t.id,
        t.progress_rate
    FROM
        "Task" t
        JOIN "TaskAccess" ta ON t.id = ta.task_id
    WHERE
        ta.user_id = '82eac3a0-5978-4259-8638-dff638707c00'::uuid
),
epsilon AS (
    SELECT
        0.0001 AS value -- Epsilon value to avoid overlap
)
SELECT
    pr.progress_min || '-' || pr.progress_max AS progress_range,
    COUNT(ut.id) AS task_count
FROM
    progress_ranges pr
    LEFT JOIN user_tasks ut ON ut.progress_rate >= pr.progress_min
        AND (ut.progress_rate < pr.progress_max
            OR (pr.progress_max = 100
                AND ut.progress_rate <= pr.progress_max))
GROUP BY
    pr.progress_min,
    pr.progress_max
ORDER BY
    pr.progress_min;

