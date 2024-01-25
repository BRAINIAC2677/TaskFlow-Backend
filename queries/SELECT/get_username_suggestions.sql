SELECT
    id,
    username
FROM
    "UserProfile"
WHERE
    username ILIKE '%' || $1 || '%'
ORDER BY
    CASE
        WHEN username = $1 THEN 1  -- Exact match has the highest priority
        WHEN username ILIKE $1 || '%' THEN 2  -- Starts with query_term
        WHEN username ILIKE '%' || $1 THEN 3  -- Ends with query_term
        ELSE 4  -- Contains query_term
    END,
    username  -- Order alphabetically as a secondary criteria
LIMIT $2;
