BEGIN
;

-- Trigger function for adding a user to a board
CREATE
OR REPLACE FUNCTION notify_user_added_to_board() RETURNS TRIGGER AS $$
DECLARE
    v_notification_id BIGINT;

v_board_name TEXT;

v_role TEXT;

BEGIN
    -- Determine the board name and role for the notification message
    SELECT
        NAME INTO v_board_name
    FROM
        "TaskBoard"
    WHERE
        id = NEW .board_id
    LIMIT
        1;

v_role := CASE
    WHEN NEW .role = 3 THEN 'member'
    ELSE 'admin'
END;

-- Insert the notification message into the Notification table
INSERT INTO
    "Notification" (BODY)
VALUES
    (
        'You have been added to the board "' || v_board_name || '"<boards/' || NEW .board_id || '>' || ' as a ' || v_role
    ) RETURNING id INTO v_notification_id;

-- Associate the notification with the user
INSERT INTO
    "UserNotification" (user_id, notification_id, is_checked)
VALUES
    (NEW .user_id, v_notification_id, FALSE);

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

CREATE
OR REPLACE TRIGGER trg_notify_user_added_to_board AFTER
INSERT
    ON "TaskBoardMember" FOR EACH ROW
    WHEN (
        NEW .role = 2
        OR NEW .role = 3
    ) EXECUTE FUNCTION notify_user_added_to_board();

-- Trigger function for assigning a task to a user
CREATE
OR REPLACE FUNCTION notify_user_assigned_to_task() RETURNS TRIGGER AS $$
DECLARE
    v_notification_id BIGINT;

v_task_name TEXT;

BEGIN
    -- Determine the task name for the notification message
    SELECT
        NAME INTO v_task_name
    FROM
        "Task"
    WHERE
        id = NEW .task_id
    LIMIT
        1;

-- Insert the notification message into the Notification table
INSERT INTO
    "Notification" (BODY)
VALUES
    (
        'You have been assigned the task "' || v_task_name || '"<tasks/' || NEW .task_id || '>'
    ) RETURNING id INTO v_notification_id;

-- Associate the notification with the user
INSERT INTO
    " UserNotification " (user_id, notification_id, is_checked)
VALUES
    (NEW .user_id, v_notification_id, FALSE);

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

CREATE
OR REPLACE TRIGGER trg_notify_user_assigned_to_task AFTER
INSERT
    ON "TaskAccess" FOR EACH ROW
    WHEN (NEW .access = 2) EXECUTE FUNCTION notify_user_assigned_to_task();

COMMIT;