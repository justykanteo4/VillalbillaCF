-- Contratos de préstamos Fantasy. Aplicar tras fantasy-schema, fantasy-game,
-- fantasy-league-lifecycle y fantasy-lineup-lock.
CREATE TABLE IF NOT EXISTS fantasy_player_loans (
 id TEXT PRIMARY KEY NOT NULL,
 league_id TEXT NOT NULL REFERENCES fantasy_leagues(id),
 lender_uid TEXT NOT NULL,
 borrower_uid TEXT NOT NULL,
 ownership_id TEXT NOT NULL,
 player_id TEXT NOT NULL,
 duration_weeks INTEGER NOT NULL CHECK(duration_weeks IN (1,2,3,4)),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','returned','rejected','cancelled','expired')),
 request_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 starts_at INTEGER,
 ends_at INTEGER,
 completed_at INTEGER,
 UNIQUE(league_id,lender_uid,request_id),
 FOREIGN KEY(league_id,lender_uid) REFERENCES fantasy_members(league_id,uid),
 FOREIGN KEY(league_id,borrower_uid) REFERENCES fantasy_members(league_id,uid),
 CHECK(lender_uid<>borrower_uid),
 CHECK(starts_at IS NULL OR ends_at>starts_at)
);
CREATE INDEX IF NOT EXISTS fantasy_loans_lender ON fantasy_player_loans(league_id,lender_uid,status,ends_at);
CREATE INDEX IF NOT EXISTS fantasy_loans_borrower ON fantasy_player_loans(league_id,borrower_uid,status,ends_at);
CREATE INDEX IF NOT EXISTS fantasy_loans_expiring ON fantasy_player_loans(status,ends_at);
CREATE UNIQUE INDEX IF NOT EXISTS fantasy_loans_one_active_player
 ON fantasy_player_loans(league_id,player_id) WHERE status IN('pending','active');

CREATE TRIGGER IF NOT EXISTS fantasy_loan_proposal_guard BEFORE INSERT ON fantasy_player_loans BEGIN
 SELECT CASE WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active' THEN RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_managers WHERE league_id=NEW.league_id AND uid=NEW.lender_uid)
    OR NOT EXISTS(SELECT 1 FROM fantasy_managers WHERE league_id=NEW.league_id AND uid=NEW.borrower_uid) THEN RAISE(ABORT,'FANTASY_LOAN_MANAGER') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_roster WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.lender_uid AND player_id=NEW.player_id) THEN RAISE(ABORT,'FANTASY_LOAN_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM fantasy_market_listings WHERE league_id=NEW.league_id AND player_id=NEW.player_id AND retired_day IS NULL) THEN RAISE(ABORT,'FANTASY_LOAN_LISTED') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.lender_uid)<=12 THEN RAISE(ABORT,'FANTASY_ROSTER_MIN') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.borrower_uid)>=16 THEN RAISE(ABORT,'FANTASY_ROSTER_MAX') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_loan_accept_guard BEFORE UPDATE OF status ON fantasy_player_loans
WHEN NEW.status='active' BEGIN
 SELECT CASE WHEN OLD.status<>'pending' OR OLD.id<>NEW.id OR OLD.ownership_id<>NEW.ownership_id OR OLD.player_id<>NEW.player_id OR
    OLD.lender_uid<>NEW.lender_uid OR OLD.borrower_uid<>NEW.borrower_uid OR OLD.duration_weeks<>NEW.duration_weeks
    OR NEW.starts_at IS NULL OR NEW.ends_at<>NEW.starts_at+NEW.duration_weeks*604800000 THEN RAISE(ABORT,'FANTASY_LOAN_CHANGED') END;
 SELECT CASE WHEN COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')<>'active' THEN RAISE(ABORT,'FANTASY_LEAGUE_INACTIVE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_roster WHERE league_id=NEW.league_id AND id=NEW.ownership_id AND uid=NEW.lender_uid AND player_id=NEW.player_id) THEN RAISE(ABORT,'FANTASY_LOAN_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM fantasy_market_listings WHERE league_id=NEW.league_id AND player_id=NEW.player_id AND retired_day IS NULL) THEN RAISE(ABORT,'FANTASY_LOAN_LISTED') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.lender_uid)<=12 THEN RAISE(ABORT,'FANTASY_ROSTER_MIN') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.borrower_uid)>=16 THEN RAISE(ABORT,'FANTASY_ROSTER_MAX') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_loan_accept_settle AFTER UPDATE OF status ON fantasy_player_loans
WHEN OLD.status='pending' AND NEW.status='active' BEGIN
 UPDATE fantasy_roster SET uid=NEW.borrower_uid,acquired_at=NEW.starts_at
 WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.lender_uid;
 UPDATE fantasy_offers SET status='cancelled' WHERE league_id=NEW.league_id AND ownership_id=NEW.ownership_id AND status='pending';
 UPDATE fantasy_lineups SET
  players_json=COALESCE((SELECT json_group_array(value) FROM json_each(players_json) WHERE value<>NEW.player_id),'[]'),
  captain_id=CASE WHEN captain_id=NEW.player_id THEN '' ELSE captain_id END,
  revision=revision+1
 WHERE league_id=NEW.league_id AND uid=NEW.lender_uid AND deadline_at>NEW.starts_at
 AND COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')='active'
 AND EXISTS(SELECT 1 FROM json_each(players_json) WHERE value=NEW.player_id);
END;
CREATE TRIGGER IF NOT EXISTS fantasy_loan_return_guard BEFORE UPDATE OF status ON fantasy_player_loans
WHEN NEW.status='returned' BEGIN
 SELECT CASE WHEN OLD.status<>'active' OR NEW.completed_at IS NULL THEN RAISE(ABORT,'FANTASY_LOAN_CHANGED') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_roster WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.borrower_uid AND player_id=NEW.player_id) THEN RAISE(ABORT,'FANTASY_LOAN_CHANGED') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.lender_uid)>=16 THEN RAISE(ABORT,'FANTASY_ROSTER_MAX') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.borrower_uid)<=12 THEN RAISE(ABORT,'FANTASY_ROSTER_MIN') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_loan_return_settle AFTER UPDATE OF status ON fantasy_player_loans
WHEN OLD.status='active' AND NEW.status='returned' BEGIN
 UPDATE fantasy_roster SET uid=NEW.lender_uid,acquired_at=NEW.completed_at
 WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.borrower_uid;
 UPDATE fantasy_lineups SET
  players_json=COALESCE((SELECT json_group_array(value) FROM json_each(players_json) WHERE value<>NEW.player_id),'[]'),
  captain_id=CASE WHEN captain_id=NEW.player_id THEN '' ELSE captain_id END,
  revision=revision+1
 WHERE league_id=NEW.league_id AND uid=NEW.borrower_uid AND deadline_at>NEW.completed_at
 AND COALESCE((SELECT state FROM fantasy_league_lifecycle WHERE league_id=NEW.league_id),'active')='active'
 AND EXISTS(SELECT 1 FROM json_each(players_json) WHERE value=NEW.player_id);
END;
-- Reserva automática de plaza del prestador: si presta 1, no puede subir de 15,
-- si presta 2, no puede subir de 14, etc., garantizando el retorno.
CREATE TRIGGER IF NOT EXISTS fantasy_loan_reserve_insert BEFORE INSERT ON fantasy_roster
WHEN (SELECT COUNT(*) FROM fantasy_player_loans
 WHERE league_id=NEW.league_id AND lender_uid=NEW.uid AND status='active')>0
BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.uid)+
   (SELECT COUNT(*) FROM fantasy_player_loans WHERE league_id=NEW.league_id AND lender_uid=NEW.uid AND status='active')>=16
 THEN RAISE(ABORT,'FANTASY_LOAN_RESERVED_SLOT') END;
END;
CREATE TRIGGER IF NOT EXISTS fantasy_loan_reserve_update BEFORE UPDATE OF uid ON fantasy_roster
WHEN OLD.uid<>NEW.uid AND (SELECT COUNT(*) FROM fantasy_player_loans
 WHERE league_id=NEW.league_id AND lender_uid=NEW.uid AND status='active')>0
BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=NEW.league_id AND uid=NEW.uid)+
  (SELECT COUNT(*) FROM fantasy_player_loans WHERE league_id=NEW.league_id AND lender_uid=NEW.uid AND status='active')>=16
 THEN RAISE(ABORT,'FANTASY_LOAN_RESERVED_SLOT') END;
END;
-- Un futbolista prestado no se puede vender, subastar, ceder otra vez ni transferir.
CREATE TRIGGER IF NOT EXISTS fantasy_loan_player_delete BEFORE DELETE ON fantasy_roster
WHEN EXISTS(SELECT 1 FROM fantasy_player_loans WHERE league_id=OLD.league_id AND ownership_id=OLD.id AND status='active')
BEGIN SELECT RAISE(ABORT,'FANTASY_LOAN_PLAYER_LOCKED'); END;
CREATE TRIGGER IF NOT EXISTS fantasy_loan_player_transfer BEFORE UPDATE OF uid ON fantasy_roster
WHEN OLD.uid<>NEW.uid AND EXISTS(SELECT 1 FROM fantasy_player_loans
 WHERE league_id=OLD.league_id AND ownership_id=OLD.id AND status='active' AND NEW.uid<>borrower_uid)
BEGIN SELECT RAISE(ABORT,'FANTASY_LOAN_PLAYER_LOCKED'); END;
-- El prestatario conserva suficientes jugadores para poder devolver los cedidos.
CREATE TRIGGER IF NOT EXISTS fantasy_loan_borrower_min_delete BEFORE DELETE ON fantasy_roster
WHEN (SELECT COUNT(*) FROM fantasy_player_loans WHERE league_id=OLD.league_id AND borrower_uid=OLD.uid AND status='active')>0
BEGIN SELECT CASE WHEN
 (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=OLD.league_id AND uid=OLD.uid)<=12+
 (SELECT COUNT(*) FROM fantasy_player_loans WHERE league_id=OLD.league_id AND borrower_uid=OLD.uid AND status='active')
 THEN RAISE(ABORT,'FANTASY_LOAN_BORROWER_MIN') END; END;
CREATE TRIGGER IF NOT EXISTS fantasy_loan_borrower_min_transfer BEFORE UPDATE OF uid ON fantasy_roster
WHEN OLD.uid<>NEW.uid AND (SELECT COUNT(*) FROM fantasy_player_loans WHERE league_id=OLD.league_id AND borrower_uid=OLD.uid AND status='active')>0
BEGIN SELECT CASE WHEN
 (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=OLD.league_id AND uid=OLD.uid)<=12+
 (SELECT COUNT(*) FROM fantasy_player_loans WHERE league_id=OLD.league_id AND borrower_uid=OLD.uid AND status='active')
 THEN RAISE(ABORT,'FANTASY_LOAN_BORROWER_MIN') END; END;
