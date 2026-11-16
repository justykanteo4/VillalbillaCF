CREATE INDEX IF NOT EXISTS push_subscription_enabled ON push_subscriptions(enabled,id,destination);
CREATE INDEX IF NOT EXISTS push_subscription_expired ON push_subscriptions(enabled,updated_at);
CREATE INDEX IF NOT EXISTS outbox_receipt ON push_outbox(status,ticket) WHERE ticket IS NOT NULL;
CREATE INDEX IF NOT EXISTS notice_author_date ON club_notices(created_by,created_at);
CREATE INDEX IF NOT EXISTS notice_unqueued ON club_notices(queued,created_at);
