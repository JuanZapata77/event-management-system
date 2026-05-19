ALTER TABLE users
ADD COLUMN IF NOT EXISTS username VARCHAR(50);

UPDATE users
SET username = lower(
    regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]+', '', 'g')
) || '_' || id
WHERE username IS NULL;

ALTER TABLE users
ALTER COLUMN username SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'users_username_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX users_username_unique_idx ON users (lower(username));
    END IF;
END $$;
