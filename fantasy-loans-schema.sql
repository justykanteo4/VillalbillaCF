-- Fase 1: contrato de préstamos (sin alterar el mercado ni las plantillas actuales).
-- No se habilitan activaciones ni devoluciones hasta instalar los triggers de protección.
CREATE TABLE IF NOT EXISTS fantasy_player_loans (
 id TEXT PRIMARY KEY NOT NULL,
 league_id TEXT NOT NULL REFERENCES fantasy_leagues(id),
 lender_uid TEXT NOT NULL,
 borrower_uid TEXT NOT NULL,
 ownership_id TEXT NOT NULL,
 player_id TEXT NOT NULL,
 duration_weeks INTEGER NOT NULL CHECK(duration_weeks BETWEEN 1 AND 4),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','returned','rejected','cancelled','expired','blocked')),
 request_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 starts_at INTEGER NOT NULL,
 ends_at INTEGER NOT NULL,
 completed_at INTEGER,
 review_note TEXT,
 UNIQUE(league_id,lender_uid,request_id),
 FOREIGN KEY(league_id,lender_uid) REFERENCES fantasy_members(league_id,uid),
 FOREIGN KEY(league_id,borrower_uid) REFERENCES fantasy_members(league_id,uid),
 CHECK(lender_uid<>borrower_uid),
 CHECK(starts_at<ends_at)
);
CREATE INDEX IF NOT EXISTS fantasy_loans_lender ON fantasy_player_loans(league_id,lender_uid,status,ends_at);
CREATE INDEX IF NOT EXISTS fantasy_loans_borrower ON fantasy_player_loans(league_id,borrower_uid,status,ends_at);
CREATE INDEX IF NOT EXISTS fantasy_loans_expiring ON fantasy_player_loans(status,ends_at);
CREATE UNIQUE INDEX IF NOT EXISTS fantasy_loans_one_active_player
 ON fantasy_player_loans(league_id,player_id) WHERE status IN ('pending','active','blocked');
-- Fails closed: this migration only records contract drafts, never transfers ownership.
CREATE TRIGGER IF NOT EXISTS fantasy_loans_block_activation
 BEFORE UPDATE OF status ON fantasy_player_loans WHEN NEW.status='active'
 BEGIN SELECT RAISE(ABORT,'FANTASY_LOAN_ACTIVATION_NOT_READY'); END;
