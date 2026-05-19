ALTER TABLE users
ADD COLUMN IF NOT EXISTS login_password_plain VARCHAR(100);

UPDATE users
SET username = lower(email)
WHERE role = 'worker'
  AND email IS NOT NULL;
