BEGIN;
CREATE OR REPLACE FUNCTION update_task_progressrate()
    RETURNS TRIGGER
    AS $$
DECLARE
    v_completion_percentage numeric;
    v_task_id int;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_task_id := OLD.task_id;
    ELSE
        v_task_id := NEW.task_id;
    END IF;
    SELECT
        COALESCE(ROUND((SUM(
                    CASE WHEN is_completed THEN
                        1
                    ELSE
                        0
                    END)::numeric / NULLIF(COUNT(*), 0)) * 100, 3), 0) INTO v_completion_percentage
    FROM
        "TaskChecklistItem"
    WHERE
        task_id = v_task_id;
    UPDATE
        "Task"
    SET
        progress_rate = v_completion_percentage,
        last_progressed = NOW()
    WHERE
        id = v_task_id;
    RETURN NULL;
    END;
$$
LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trg_taskchecklistitem_insert
    AFTER INSERT ON "TaskChecklistItem"
    FOR EACH ROW
    EXECUTE FUNCTION update_task_progressrate();
CREATE OR REPLACE TRIGGER trg_taskchecklistitem_update
    AFTER UPDATE ON "TaskChecklistItem"
    FOR EACH ROW
    WHEN(OLD.is_completed IS DISTINCT FROM NEW.is_completed OR OLD.last_updated IS DISTINCT FROM NEW.last_updated)
    EXECUTE FUNCTION update_task_progressrate();
CREATE OR REPLACE TRIGGER trg_taskchecklistitem_delete
    AFTER DELETE ON "TaskChecklistItem"
    FOR EACH ROW
    EXECUTE FUNCTION update_task_progressrate();
COMMIT;

