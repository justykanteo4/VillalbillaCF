CREATE INDEX IF NOT EXISTS admin_access_event_date ON admin_access_events(created_at,id);
CREATE INDEX IF NOT EXISTS admin_access_event_unresolved ON admin_access_events(resolved,created_at,id);
CREATE INDEX IF NOT EXISTS access_notice_user_date ON access_notice_events(uid,created_at,id);
CREATE INDEX IF NOT EXISTS access_job_queue ON access_push_jobs(status,next_at);
