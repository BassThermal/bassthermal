ALTER TABLE visit_sessions ADD COLUMN last_heartbeat_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE visit_sessions ADD COLUMN visible_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE visit_events ADD COLUMN action TEXT NOT NULL DEFAULT '';
ALTER TABLE visit_events ADD COLUMN source_path TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_sessions_day_visitor ON visit_sessions(day_et, visitor_hash);
CREATE INDEX IF NOT EXISTS idx_events_action_day ON visit_events(day_et, action);
CREATE INDEX IF NOT EXISTS idx_events_path_day ON visit_events(day_et, path);
