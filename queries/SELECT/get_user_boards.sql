SELECT
    a.id AS board_id,
    a.name AS board_name,
    a.due_timestamp,
    a.description,
    b.role,
    (
        SELECT
            JSON_BUILD_OBJECT('user_id', d.id, 'username', d.username) AS owner_info
        FROM
            "TaskBoardMember" c
            JOIN "UserProfile" d ON d.id = c.user_id
        WHERE
            c.role = 1
            AND c.board_id = a.id
        LIMIT
            1
    ) AS owner_info
FROM
    "TaskBoard" a
    JOIN "TaskBoardMember" b ON a.id = b.board_id
WHERE
    b.user_id = $1
ORDER BY
    board_id;