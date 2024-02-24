SELECT
    t.id,
    t.name,
    t.description,
    t.start_timestamp,
    t.due_timestamp,
    (
        SELECT
            JSON_AGG(
                JSON_BUILD_OBJECT('label_id', l.id, 'label_name', l.name)
            )
        FROM
            "Label" l
            JOIN "TaskLabel" tl ON tl.label_id = l.id
        WHERE
            tl.task_id = t.id
    ) AS labels,
    (
        SELECT
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'item_id',
                    tcli.id,
                    'item_name',
                    tcli.name,
                    'is_completed',
                    tcli.is_completed
                )
            )
        FROM
            "TaskChecklistItem" tcli
        WHERE
            tcli.task_id = t.id
    ) AS checklist_items,
    t.label_color,
    (
        SELECT
            access
        FROM
            "TaskAccess"
        WHERE
            task_id = t.id
            AND user_id = '82eac3a0-5978-4259-8638-dff638707c00' :: uuid
    )
FROM
    "Task" t
WHERE
    t.id = 1;