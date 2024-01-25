INSERT INTO
    "TaskList" (board_id, name, description, due_timestamp)
VALUES
    ($ 1, $ 2, $ 3, $ 4) RETURNING id;