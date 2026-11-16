CREATE INDEX IF NOT EXISTS vote_notice_event_date ON vote_notice_events(created_at,id);
CREATE TABLE IF NOT EXISTS vote_notice_cursors(token_id TEXT NOT NULL,admin_uid TEXT NOT NULL,last_created_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(token_id,admin_uid));
CREATE INDEX IF NOT EXISTS fantasy_live_updated ON fantasy_live_matches(updated_at);
CREATE INDEX IF NOT EXISTS fantasy_award_week ON fantasy_awards(week,kind,player_id);
CREATE INDEX IF NOT EXISTS fantasy_manager_league ON fantasy_managers(league_id,initialized_at,uid);
CREATE INDEX IF NOT EXISTS fantasy_roster_member ON fantasy_roster(league_id,uid,player_id);
