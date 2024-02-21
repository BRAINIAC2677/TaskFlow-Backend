SELECT
    tb.id AS board_id,
    tb.name AS board_name,
    tb.due_timestamp,
    tb.description,
    COALESCE(AVG(t.progress_rate), 0) AS progress,
    'null' AS status,
    tbm.role,
    (
        SELECT
            JSON_BUILD_OBJECT('user_id', up.id, 'username', up.username) AS owner_info
        FROM
            "TaskBoardMember" tbm_owner
            JOIN "UserProfile" up ON up.id = tbm_owner.user_id
        WHERE
            tbm_owner.role = 1
            AND tbm_owner.board_id = tb.id
        LIMIT
            1
    ) AS owner_info
FROM
    "TaskBoard" tb
    JOIN "TaskBoardMember" tbm ON tb.id = tbm.board_id
    LEFT JOIN "TaskList" l ON tb.id = l.board_id
    LEFT JOIN "Task" t ON l.id = t.list_id
WHERE
    tbm.user_id = $1
GROUP BY
    tb.id,
    tb.name,
    tb.due_timestamp,
    tb.description,
    tbm.role
ORDER BY
    board_id;