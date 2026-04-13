-- Add personal Teams webhook URL to hiring manager profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS teams_webhook_url text;
