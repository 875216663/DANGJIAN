CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  code VARCHAR(32) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  establish_date DATE NOT NULL,
  renewal_reminder_date DATE NOT NULL,
  secretary_id INTEGER NULL,
  secretary_name VARCHAR(80) NOT NULL DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  committee_members JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  gender VARCHAR(8) NOT NULL DEFAULT '男',
  birthday DATE NULL,
  department VARCHAR(120) NOT NULL DEFAULT '',
  position VARCHAR(120) NOT NULL DEFAULT '',
  political_status VARCHAR(32) NOT NULL DEFAULT '中共党员',
  join_date DATE NOT NULL,
  regular_date DATE NULL,
  last_fee_month VARCHAR(7) NOT NULL DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  phone VARCHAR(32) NOT NULL DEFAULT '',
  email VARCHAR(128) NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activists (
  id INTEGER PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  gender VARCHAR(8) NOT NULL DEFAULT '男',
  nation VARCHAR(32) NOT NULL DEFAULT '汉族',
  birthday DATE NULL,
  education VARCHAR(64) NOT NULL DEFAULT '',
  application_date DATE NOT NULL,
  talk_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  meeting_type VARCHAR(64) NOT NULL DEFAULT '支部大会',
  meeting_date DATE NOT NULL,
  location VARCHAR(160) NOT NULL DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'planned',
  moderator VARCHAR(80) NOT NULL DEFAULT '',
  lecturer VARCHAR(80) NOT NULL DEFAULT '',
  lecturer_title VARCHAR(80) NOT NULL DEFAULT '',
  subject VARCHAR(160) NOT NULL DEFAULT '',
  attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  absentees JSONB NOT NULL DEFAULT '[]'::jsonb,
  meeting_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  topics TEXT NOT NULL DEFAULT '',
  meeting_details TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  notice_type VARCHAR(40) NOT NULL DEFAULT '通知',
  priority VARCHAR(24) NOT NULL DEFAULT 'normal',
  publisher_id INTEGER NOT NULL,
  publish_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date DATE NULL,
  is_top BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(24) NOT NULL DEFAULT 'published',
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_files (
  id TEXT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  uploaded_by VARCHAR(80) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stored_file_name VARCHAR(255) NOT NULL,
  relative_path TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_branch_id ON members(branch_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_last_fee_month ON members(last_fee_month);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
CREATE INDEX IF NOT EXISTS idx_activists_branch_id ON activists(branch_id);
CREATE INDEX IF NOT EXISTS idx_meetings_branch_id ON meetings(branch_id);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_date ON meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_notices_publish_date ON notices(publish_date DESC);
