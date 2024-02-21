SELECT
    COUNT(DISTINCT (tb.id)) AS active_board_count
FROM
    "TaskBoard" tb
    JOIN "TaskBoardMember" tbm ON tb.id = tbm.board_id
    JOIN "TaskList" tl ON tb.id = tl.board_id
    JOIN "Task" t ON tl.id = t.list_id
WHERE
    t.last_progressed > CURRENT_DATE - INTERVAL '7 days'
    AND tbm.user_id = '1a847942-50e1-4229-bfb4-8f1737a3347e'::uuid;

