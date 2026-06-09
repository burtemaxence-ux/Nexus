-- Widen pin column to store bcrypt hash (~60 chars) instead of plain 4-digit PIN
ALTER TABLE public.profiles ALTER COLUMN pin TYPE varchar(100);
