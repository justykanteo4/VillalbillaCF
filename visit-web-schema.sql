-- La web comparte el total histórico con las aperturas de APK, sin reiniciarlo.
CREATE TABLE IF NOT EXISTS web_visit_events (
 id TEXT PRIMARY KEY,
 platform TEXT NOT NULL CHECK (platform='web'),
 created_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS web_visit_count AFTER INSERT ON web_visit_events
BEGIN
 UPDATE apk_visit_totals SET total=total+1 WHERE id=1;
END;
