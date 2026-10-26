CREATE TABLE IF NOT EXISTS apk_visit_totals (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
);
INSERT OR IGNORE INTO apk_visit_totals(id,total) VALUES(1,0);
CREATE TABLE IF NOT EXISTS apk_visit_events (
 id TEXT PRIMARY KEY,
 platform TEXT NOT NULL CHECK (platform IN ('android','ios')),
 created_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS apk_visit_count AFTER INSERT ON apk_visit_events
BEGIN
 UPDATE apk_visit_totals SET total=total+1 WHERE id=1;
END;
