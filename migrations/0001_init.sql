-- Ship60 initial schema (PRD §6.4). Orchestrator-owned.
-- All timestamps are ISO-8601 UTC strings.

CREATE TABLE colleges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  city TEXT,
  state TEXT
);
CREATE INDEX idx_colleges_name ON colleges(name);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  college_id TEXT REFERENCES colleges(id),
  college_other TEXT,
  branch TEXT NOT NULL,
  grad_year INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','ambassador')),
  ref_code TEXT NOT NULL UNIQUE,
  referred_by TEXT REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  seat_no INTEGER NOT NULL UNIQUE,
  idea_key TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT,
  share_variant TEXT,
  ip_hash TEXT, user_agent TEXT,
  consent_at TEXT NOT NULL,
  flag_reason TEXT, flag_status TEXT CHECK (flag_status IN ('open','approved','rejected')),
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_users_college ON users(college_id);
CREATE INDEX idx_users_created ON users(created_at);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_flag_status ON users(flag_status);

CREATE TABLE referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES users(id),
  referee_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rejected')),
  created_at TEXT NOT NULL,
  qualified_at TEXT,
  is_simulated INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id, status);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  anon_id TEXT, user_id TEXT, ref_code TEXT,
  props TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_type_time ON events(type, created_at);
CREATE INDEX idx_events_created ON events(created_at);

CREATE TABLE checkins (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  workshop_id TEXT NOT NULL,
  checked_in_at TEXT NOT NULL,
  is_simulated INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_checkins_workshop ON checkins(workshop_id);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  live_url TEXT NOT NULL,
  repo_url TEXT,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued','evaluated','failed','manual')),
  score INTEGER,
  evaluation TEXT,
  cert_id TEXT UNIQUE,
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_submissions_user ON submissions(user_id);
