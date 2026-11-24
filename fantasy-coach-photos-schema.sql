CREATE TABLE IF NOT EXISTS fantasy_coach_photos(coach_id TEXT PRIMARY KEY,photo_data TEXT NOT NULL,updated_at INTEGER NOT NULL,actor_uid TEXT NOT NULL,approved INTEGER NOT NULL DEFAULT 0);
