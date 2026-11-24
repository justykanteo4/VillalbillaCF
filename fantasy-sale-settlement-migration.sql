DROP TRIGGER IF EXISTS fantasy_sale_settle;
CREATE TRIGGER fantasy_sale_settle AFTER INSERT ON fantasy_player_sales BEGIN
 DELETE FROM fantasy_roster WHERE id=NEW.ownership_id AND league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallet_cents SET delta_cents=delta_cents+NEW.amount_cents WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallet_values SET delta_tenths=(SELECT delta_cents/10.0 FROM fantasy_wallet_cents WHERE league_id=NEW.league_id AND uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_wallets SET delta_units=(SELECT delta_cents/50.0 FROM fantasy_wallet_cents WHERE league_id=NEW.league_id AND uid=NEW.uid) WHERE league_id=NEW.league_id AND uid=NEW.uid;
 UPDATE fantasy_offers SET status='cancelled' WHERE league_id=NEW.league_id AND ownership_id=NEW.ownership_id AND status='pending';
 UPDATE fantasy_lineups SET players_json=COALESCE((SELECT json_group_array(value) FROM json_each(players_json) WHERE value!=NEW.player_id),'[]'),captain_id=CASE WHEN captain_id=NEW.player_id THEN '' ELSE captain_id END,revision=revision+1 WHERE league_id=NEW.league_id AND uid=NEW.uid AND deadline_at>NEW.created_at AND EXISTS(SELECT 1 FROM json_each(players_json) WHERE value=NEW.player_id) AND COALESCE((SELECT json_extract(settings_json,'$.lineupsLocked') FROM fantasy_leagues WHERE id=NEW.league_id),0)<>1;
END;
