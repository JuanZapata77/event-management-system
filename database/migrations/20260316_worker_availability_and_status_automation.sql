ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_available_for_shifts BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS unavailable_from DATE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS unavailable_to DATE;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT c.conname
    INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE t.relname = 'events'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE events DROP CONSTRAINT %I', constraint_name);
    END IF;

    ALTER TABLE events
    ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'));
END $$;
