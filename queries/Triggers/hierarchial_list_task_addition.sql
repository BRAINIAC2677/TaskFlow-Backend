BEGIN
;

-- Function to add or remove a user to/from all underlying lists when they are added to/removed from a board
-- adding to lists with the same access as board
CREATE
OR REPLACE FUNCTION update_user_list_access() RETURNS TRIGGER AS $$ BEGIN
    IF TG_OP = 'INSERT' THEN
    INSERT INTO
        "TaskListAccess" (list_id, access, user_id)
    SELECT
        tl.id,
        (
            CASE
                WHEN NEW .role <= 2 THEN 2
                WHEN NEW .role > 2 THEN 3
            END
        ),
        NEW .user_id
    FROM
        "TaskList" tl
    WHERE
        tl.board_id = NEW .board_id;

-- ON CONFLICT (list_id, user_id) DO NOTHING;
ELSIF TG_OP = 'DELETE' THEN
DELETE FROM
    "TaskListAccess"
WHERE
    user_id = OLD .user_id
    AND list_id IN (
        SELECT
            id
        FROM
            "TaskList"
        WHERE
            board_id = OLD .board_id
    );

END IF;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

CREATE
OR REPLACE TRIGGER trg_update_user_list_access AFTER
INSERT
    OR
DELETE
    ON "TaskBoardMember" FOR EACH ROW EXECUTE FUNCTION update_user_list_access();

-- Function to add or remove a user to/from all tasks under a list when they are added to/removed from that list
CREATE
OR REPLACE FUNCTION update_user_task_access() RETURNS TRIGGER AS $$ BEGIN
    IF TG_OP = 'INSERT' THEN
    INSERT INTO
        "TaskAccess" (task_id, access, user_id)
    SELECT
        t.id,
        (
            CASE
                WHEN NEW .access <= 2 THEN 1
                WHEN NEW .access > 2 THEN 3
            END
        ),
        NEW .user_id
    FROM
        "Task" t
    WHERE
        t.list_id = NEW .list_id;

-- ON CONFLICT (task_id, user_id) DO NOTHING;
ELSIF TG_OP = 'DELETE' THEN
DELETE FROM
    "TaskAccess"
WHERE
    user_id = OLD .user_id
    AND task_id IN (
        SELECT
            id
        FROM
            "Task"
        WHERE
            list_id = OLD .list_id
    );

END IF;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

CREATE
OR REPLACE TRIGGER trg_update_user_task_access AFTER
INSERT
    OR
DELETE
    ON "TaskListAccess" FOR EACH ROW EXECUTE FUNCTION update_user_task_access();

COMMIT;