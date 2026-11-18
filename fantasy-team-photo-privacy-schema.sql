-- Each Fantasy team controls whether its image is shared with other league participants.
-- No row means the legacy setting: visible. The owner still sees their own image.
CREATE TABLE IF NOT EXISTS fantasy_team_photo_privacy (
 league_id TEXT NOT NULL,
 uid TEXT NOT NULL,
 visible INTEGER NOT NULL DEFAULT 1 CHECK(visible IN(0,1)),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_at INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(league_id,uid),
 FOREIGN KEY(league_id,uid) REFERENCES fantasy_members(league_id,uid)
);
