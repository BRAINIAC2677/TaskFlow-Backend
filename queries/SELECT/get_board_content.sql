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
    tb.id = '$1'
GROUP BY
    tb.id,
    tb.name;