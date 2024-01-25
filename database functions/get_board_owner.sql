CREATE OR REPLACE FUNCTION get_board_owner(board_id_input integer)
    RETURNS TABLE(
        owner_id uuid,
        owner_username text
    )
    AS $$
BEGIN
    SELECT
        c.user_id,
        d.username INTO owner_id,
        owner_username
    FROM
        "TaskBoardMember" c,
        "UserProfile" d
    WHERE
        c.board_id = board_id_input
        AND c.user_id = d.id
        AND c.role = 1;
    RETURN NEXT;
END;
$$
LANGUAGE plpgsql;

