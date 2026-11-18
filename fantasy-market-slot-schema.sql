-- Optional number of league-wide automatic market slots, legacy leagues default to 16.
-- Only the Club can change settings through the authorized API.
CREATE TABLE IF NOT EXISTS fantasy_market_slot_settings(
 league_id TEXT PRIMARY KEY NOT NULL REFERENCES fantasy_leagues(id),
 slots INTEGER NOT NULL DEFAULT 16 CHECK(slots BETWEEN 16 AND 24),
 revision INTEGER NOT NULL DEFAULT 0,
 changed_by TEXT NOT NULL,
 changed_at INTEGER NOT NULL
);
