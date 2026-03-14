ALTER TABLE events
ADD COLUMN IF NOT EXISTS caterers_needed INTEGER NOT NULL DEFAULT 0;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS bartenders_needed INTEGER NOT NULL DEFAULT 0;

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
    CHECK (status IN ('draft', 'pending', 'confirmed', 'completed', 'cancelled'));
END $$;
