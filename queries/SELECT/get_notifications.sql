SELECT
    n.id AS id,
    n.body AS BODY,
    n.created_at AS TIMESTAMP,
    un.is_checked AS READ,
    n.url_1 AS url_1,
    n.url_2 AS url_2
FROM
    "Notification" n
    JOIN "UserNotification" un ON n.id = un.notification_id
WHERE
    un.user_id = '82eac3a0-5978-4259-8638-dff638707c00' :: uuid
ORDER BY
    n.created_at DESC
LIMIT
    10 OFFSET 0