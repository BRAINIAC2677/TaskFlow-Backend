SELECT
    a.id AS id,
    a.start_timestamp AS start,
    a.due_timestamp AS
end,
a.name AS title,
a.label_color AS backgroundColor,
CASE
    WHEN b.access <= 2 THEN true
    WHEN b.access > 2 THEN false
END editable
FROM
    "Task" a,
    "TaskAccess" b,
    "TaskBoardMember" c
WHERE
    a.id = b.task_id
    AND b.member_id = c.id
    and c.user_id = $ 1
ORDER BY
    a.id,
    a.name;