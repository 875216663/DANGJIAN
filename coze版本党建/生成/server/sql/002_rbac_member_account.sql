CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(32) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS remark TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(80) NOT NULL,
  mobile VARCHAR(32) NOT NULL DEFAULT '',
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  branch_id INTEGER NULL REFERENCES branches(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;

CREATE SEQUENCE IF NOT EXISTS branches_id_seq;
ALTER TABLE branches ALTER COLUMN id SET DEFAULT nextval('branches_id_seq');
SELECT setval(
  'branches_id_seq',
  COALESCE((SELECT MAX(id) FROM branches), 0) + 1,
  false
);

CREATE SEQUENCE IF NOT EXISTS members_id_seq;
ALTER TABLE members ALTER COLUMN id SET DEFAULT nextval('members_id_seq');
SELECT setval(
  'members_id_seq',
  COALESCE((SELECT MAX(id) FROM members), 0) + 1,
  false
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_user_id_fkey'
  ) THEN
    ALTER TABLE members
      ADD CONSTRAINT members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_user_id_key'
  ) THEN
    ALTER TABLE members
      ADD CONSTRAINT members_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

INSERT INTO roles (code, name, description)
VALUES
  ('committee_leader', '党委领导', '查看全公司党建总览、支部和党员总体情况，只读访问'),
  ('party_admin', '党建纪检部', '可维护党支部、党员信息，并在新增党员时同步生成账号'),
  ('branch_secretary', '党支部书记/委员', '仅可查看本支部数据，可新增本支部党员'),
  ('party_member', '普通党员', '仅可查看本人党员档案，无创建权限')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();
