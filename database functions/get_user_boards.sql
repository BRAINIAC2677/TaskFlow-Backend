DROP FUNCTION get_user_boards(uuid);

CREATE OR REPLACE FUNCTION get_user_boards(user_id_input uuid)
    RETURNS TABLE(
        board_id uuid,
        board_name text,
        board_description text,
        owner_id uuid,
        owner_username text
    )
    AS $$
BEGIN
    FOR board_id,
    board_name,
    board_description,
    owner_id,
    owner_username IN
    SELECT
        a.id,
        a.name,
        a.description,
        c.user_id,
        d.username
    FROM
        "TaskBoard" a,
        "TaskBoardMember" c,
        "UserProfile" d
    WHERE
        c.user_id = user_id_input
        AND c.board_id = a.id
        AND c.user_id = d.id
        AND c.role = 1 LOOP
            RETURN NEXT;
        END LOOP;
END;
$$
LANGUAGE plpgsql;

-- SELECT * FROM get_user_boards('92df4105-4ef5-422a-b829-4ac0782a6ba0'::uuid);
