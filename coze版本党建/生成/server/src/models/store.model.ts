import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { hashSync } from 'bcryptjs';
import { getDatabasePool, isDatabaseEnabled, type DatabaseExecutor } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ensureDirectory } from '../utils/file';
import { getCurrentMonth, getLastMonth } from '../utils/date';
import { DEMO_ACCOUNT_SEEDS, getUserDisplayName } from './auth.model';
import type {
  ActivistRecord,
  BranchRecord,
  MeetingRecord,
  MemberRecord,
  NoticeRecord,
  StoreData,
  StudyFileRecord,
} from './types';
import { ROLE_CODES, ROLE_LABELS } from '../utils/rbac';

const DATA_DIR = resolve(process.cwd(), 'data');
const DB_FILE = resolve(DATA_DIR, 'local-db.json');
const STORE_LOCK_KEY = 2026041501;

const DEFAULT_STORE: StoreData = {
  branches: [
    {
      id: 1,
      name: '综合管理党支部',
      code: 'B001',
      description: '负责人力资源、综合行政、财务等基础管理条线的党建信息维护。',
      contact_phone: '010-66000001',
      establish_date: '2020-01-15',
      renewal_reminder_date: '2026-12-15',
      secretary_id: 1,
      secretary_name: '张书记',
      status: 'active',
      remark: '负责基础党建台账与组织关系维护。',
      committee_members: [
        { position: '书记', name: '张书记' },
        { position: '组织委员', name: '李委员' },
      ],
    },
    {
      id: 2,
      name: '研发运营党支部',
      code: 'B002',
      description: '负责技术研发、产品运营及项目实施条线的党员与支部基础信息管理。',
      contact_phone: '010-66000002',
      establish_date: '2020-03-20',
      renewal_reminder_date: '2026-10-20',
      secretary_id: 3,
      secretary_name: '王纪检',
      status: 'active',
      remark: '负责研发、产品、运营条线党建日常管理。',
      committee_members: [
        { position: '书记', name: '王纪检' },
        { position: '组织委员', name: '周主管' },
      ],
    },
  ],
  members: [
    {
      id: 1,
      name: '陈晓明',
      gender: '男',
      birthday: '1986-06-15',
      department: '综合管理部',
      position: '部门经理',
      political_status: '中共党员',
      join_date: '2014-07-01',
      regular_date: '2015-07-01',
      last_fee_month: '2026-04',
      status: 'active',
      branch_id: 1,
      phone: '13800000001',
      email: 'chenxm@example.com',
      remarks: '负责综合管理条线党员档案维护。',
      avatar_url: '',
    },
    {
      id: 2,
      name: '刘雨桐',
      gender: '女',
      birthday: '1992-09-20',
      department: '产品研发部',
      position: '高级工程师',
      political_status: '预备党员',
      join_date: '2023-11-01',
      regular_date: '2026-06-30',
      last_fee_month: '2026-03',
      status: 'probationary',
      branch_id: 2,
      phone: '13800000002',
      email: 'liuyt@example.com',
      remarks: '需要在本季度内完成转正材料复核。',
      avatar_url: '',
    },
    {
      id: 3,
      name: '周建国',
      gender: '男',
      birthday: '1978-03-10',
      department: '运营管理部',
      position: '运营经理',
      political_status: '中共党员',
      join_date: '2010-05-01',
      regular_date: '2011-05-01',
      last_fee_month: '2026-01',
      status: 'active',
      branch_id: 2,
      phone: '13800000003',
      email: 'zhoujg@example.com',
      remarks: '党费缴纳存在滞后，需要重点跟进。',
      avatar_url: '',
    },
    {
      id: 4,
      name: '林思雨',
      gender: '女',
      birthday: '1995-12-05',
      department: '产品研发部',
      position: '工程师',
      political_status: '中共党员',
      join_date: '2020-06-01',
      regular_date: '2021-06-01',
      last_fee_month: '2026-04',
      status: 'active',
      branch_id: 2,
      phone: '13800000004',
      email: 'linsy@example.com',
      remarks: '',
      avatar_url: '',
    },
    {
      id: 5,
      name: '何文博',
      gender: '男',
      birthday: '1988-02-18',
      department: '财务部',
      position: '财务专员',
      political_status: '中共党员',
      join_date: '2018-09-01',
      regular_date: '2019-09-01',
      last_fee_month: '2026-04',
      status: 'active',
      branch_id: 1,
      phone: '13800000005',
      email: 'hewb@example.com',
      remarks: '',
      avatar_url: '',
    },
    {
      id: 6,
      name: '赵婷',
      gender: '女',
      birthday: '1989-07-08',
      department: '行政部',
      position: '主管',
      political_status: '中共党员',
      join_date: '2016-03-15',
      regular_date: '2017-03-15',
      last_fee_month: '2026-02',
      status: 'active',
      branch_id: 1,
      phone: '13800000006',
      email: 'zhaoting@example.com',
      remarks: '支部会议组织经验丰富。',
      avatar_url: '',
    },
  ],
  activists: [],
  meetings: [],
  notices: [],
  studyFiles: [],
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStore(value: Partial<StoreData> | null | undefined): StoreData {
  const normalized: StoreData = {
    branches: Array.isArray(value?.branches) ? value.branches : deepClone(DEFAULT_STORE.branches),
    members: Array.isArray(value?.members) ? value.members : deepClone(DEFAULT_STORE.members),
    activists: Array.isArray(value?.activists) ? value.activists : [],
    meetings: Array.isArray(value?.meetings) ? value.meetings : [],
    notices: Array.isArray(value?.notices) ? value.notices : [],
    studyFiles: Array.isArray(value?.studyFiles) ? value.studyFiles : [],
  };

  normalized.branches.sort((a, b) => a.id - b.id);
  normalized.members.sort((a, b) => a.id - b.id);
  normalized.activists.sort((a, b) => a.id - b.id);
  normalized.meetings.sort((a, b) => a.id - b.id);
  normalized.notices.sort((a, b) => a.id - b.id);
  normalized.studyFiles.sort((a, b) => a.id.localeCompare(b.id));

  return normalized;
}

function ensureLocalDataFile() {
  ensureDirectory(DATA_DIR);

  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
  }
}

function getInitialStoreSeed() {
  if (!existsSync(DB_FILE)) {
    return deepClone(DEFAULT_STORE);
  }

  try {
    return normalizeStore(JSON.parse(readFileSync(DB_FILE, 'utf8')) as Partial<StoreData>);
  } catch (error) {
    logger.warn('Failed to parse local seed file, fallback to default store', error);
    return deepClone(DEFAULT_STORE);
  }
}

async function ensureDatabaseSchema(db: DatabaseExecutor) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      code VARCHAR(32) NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      contact_phone VARCHAR(32) NOT NULL DEFAULT '',
      establish_date DATE NOT NULL,
      renewal_reminder_date DATE NOT NULL,
      secretary_id INTEGER NULL,
      secretary_name VARCHAR(80) NOT NULL DEFAULT '',
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      remark TEXT NOT NULL DEFAULT '',
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
      user_id INTEGER NULL,
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

    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(80) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

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

    ALTER TABLE branches ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(32) NOT NULL DEFAULT '';
    ALTER TABLE branches ADD COLUMN IF NOT EXISTS remark TEXT NOT NULL DEFAULT '';
    ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;

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

    CREATE INDEX IF NOT EXISTS idx_members_branch_id ON members(branch_id);
    CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
    CREATE INDEX IF NOT EXISTS idx_members_last_fee_month ON members(last_fee_month);
    CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
    CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
    CREATE INDEX IF NOT EXISTS idx_activists_branch_id ON activists(branch_id);
    CREATE INDEX IF NOT EXISTS idx_meetings_branch_id ON meetings(branch_id);
    CREATE INDEX IF NOT EXISTS idx_meetings_meeting_date ON meetings(meeting_date DESC);
    CREATE INDEX IF NOT EXISTS idx_notices_publish_date ON notices(publish_date DESC);
    CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
    CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
  `);

  const branchCount = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM branches');
  if (Number(branchCount.rows[0]?.count ?? '0') === 0) {
    await writeStoreToDatabase(db, getInitialStoreSeed());
  }

  await ensureRoleSeeds(db);
  await ensureDemoUsers(db);
}

async function ensureRoleSeeds(db: DatabaseExecutor) {
  const roleSeeds = [
    {
      code: ROLE_CODES.committeeLeader,
      name: ROLE_LABELS[ROLE_CODES.committeeLeader],
      description: '可查看全公司党建总览、支部与党员总体情况，只读访问。',
    },
    {
      code: ROLE_CODES.partyAdmin,
      name: ROLE_LABELS[ROLE_CODES.partyAdmin],
      description: '可维护党支部、党员信息，并在新增党员时同步生成账号。',
    },
    {
      code: ROLE_CODES.branchSecretary,
      name: ROLE_LABELS[ROLE_CODES.branchSecretary],
      description: '仅可查看本支部数据，可新增本支部党员。',
    },
    {
      code: ROLE_CODES.partyMember,
      name: ROLE_LABELS[ROLE_CODES.partyMember],
      description: '仅可查看本人党员档案，无创建权限。',
    },
  ];

  for (const role of roleSeeds) {
    await db.query(
      `
        INSERT INTO roles (code, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (code)
        DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW()
      `,
      [role.code, role.name, role.description]
    );
  }
}

async function ensureDemoUsers(db: DatabaseExecutor) {
  const passwordHash = hashSync(env.DEFAULT_LOGIN_PASSWORD, 10);
  const branchResult = await db.query<{
    id: number;
    name: string;
  }>('SELECT id, name FROM branches ORDER BY id ASC LIMIT 1');
  const firstBranch = branchResult.rows[0];

  for (const seed of DEMO_ACCOUNT_SEEDS) {
    const roleResult = await db.query<{ id: number }>('SELECT id FROM roles WHERE code = $1', [
      seed.role,
    ]);
    const roleId = Number(roleResult.rows[0]?.id);
    if (!roleId) {
      continue;
    }

    const branchId = seed.useFirstBranch ? firstBranch?.id ?? null : null;
    const existingUser = await db.query<{ id: number }>(
      'SELECT id FROM users WHERE username = $1 LIMIT 1',
      [seed.username]
    );

    let userId = Number(existingUser.rows[0]?.id ?? 0);
    if (!userId) {
      const inserted = await db.query<{ id: number }>(
        `
          INSERT INTO users (
            username, password_hash, name, mobile, role_id, branch_id, status, is_demo, description
          )
          VALUES ($1, $2, $3, '', $4, $5, 'active', TRUE, $6)
          RETURNING id
        `,
        [seed.username, passwordHash, seed.name, roleId, branchId, seed.description]
      );
      userId = Number(inserted.rows[0]?.id ?? 0);
    } else {
      await db.query(
        `
          UPDATE users
          SET name = $2,
              role_id = $3,
              branch_id = $4,
              status = 'active',
              is_demo = TRUE,
              description = $5,
              updated_at = NOW()
          WHERE id = $1
        `,
        [userId, seed.name, roleId, branchId, seed.description]
      );
    }

    if (seed.bindFirstBranchMember && firstBranch?.id) {
      const memberResult = await db.query<{ id: number }>(
        `
          SELECT id
          FROM members
          WHERE branch_id = $1
            AND (user_id IS NULL OR user_id = $2)
          ORDER BY id ASC
          LIMIT 1
        `,
        [firstBranch.id, userId]
      );

      const memberId = Number(memberResult.rows[0]?.id ?? 0);
      if (memberId) {
        await db.query(
          `
            UPDATE members
            SET user_id = $2, updated_at = NOW()
            WHERE id = $1
          `,
          [memberId, userId]
        );
      }
    }
  }
}

function toDateValue(value: string) {
  return value?.trim() ? value : null;
}

function toJson(value: unknown) {
  return JSON.stringify(value ?? []);
}

async function readStoreFromDatabase(db: DatabaseExecutor): Promise<StoreData> {
  const [branches, members, activists, meetings, notices, studyFiles] = await Promise.all([
    db.query('SELECT * FROM branches ORDER BY id ASC'),
    db.query('SELECT * FROM members ORDER BY id ASC'),
    db.query('SELECT * FROM activists ORDER BY id ASC'),
    db.query('SELECT * FROM meetings ORDER BY id ASC'),
    db.query('SELECT * FROM notices ORDER BY id ASC'),
    db.query('SELECT * FROM study_files ORDER BY uploaded_at DESC'),
  ]);

  return normalizeStore({
    branches: branches.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      code: row.code,
      description: row.description,
      contact_phone: row.contact_phone || '',
      establish_date: row.establish_date ? String(row.establish_date).slice(0, 10) : '',
      renewal_reminder_date: row.renewal_reminder_date ? String(row.renewal_reminder_date).slice(0, 10) : '',
      secretary_id: row.secretary_id ? Number(row.secretary_id) : undefined,
      secretary_name: row.secretary_name || '',
      status: row.status,
      remark: row.remark || '',
      committee_members: Array.isArray(row.committee_members) ? row.committee_members : [],
    })),
    members: members.rows.map((row) => ({
      id: Number(row.id),
      user_id: row.user_id ? Number(row.user_id) : undefined,
      name: row.name,
      gender: row.gender,
      birthday: row.birthday ? String(row.birthday).slice(0, 10) : '',
      department: row.department,
      position: row.position,
      political_status: row.political_status,
      join_date: String(row.join_date).slice(0, 10),
      regular_date: row.regular_date ? String(row.regular_date).slice(0, 10) : '',
      last_fee_month: row.last_fee_month || '',
      status: row.status,
      branch_id: Number(row.branch_id),
      phone: row.phone || '',
      email: row.email || '',
      remarks: row.remarks || '',
      avatar_url: row.avatar_url || '',
    })),
    activists: activists.rows.map((row) => ({
      id: Number(row.id),
      branch_id: Number(row.branch_id),
      name: row.name,
      gender: row.gender,
      nation: row.nation,
      birthday: row.birthday ? String(row.birthday).slice(0, 10) : '',
      education: row.education || '',
      application_date: String(row.application_date).slice(0, 10),
      talk_date: String(row.talk_date).slice(0, 10),
    })),
    meetings: meetings.rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      meeting_type: row.meeting_type,
      meeting_date: String(row.meeting_date).slice(0, 10),
      location: row.location || '',
      status: row.status,
      moderator: row.moderator || '',
      lecturer: row.lecturer || '',
      lecturer_title: row.lecturer_title || '',
      subject: row.subject || '',
      attendees: Array.isArray(row.attendees) ? row.attendees : [],
      absentees: Array.isArray(row.absentees) ? row.absentees : [],
      meeting_categories: Array.isArray(row.meeting_categories) ? row.meeting_categories : [],
      topics: row.topics || '',
      meeting_details: row.meeting_details || '',
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      branch_id: Number(row.branch_id),
      created_by: Number(row.created_by),
      created_at: String(row.created_at),
      updated_at: row.updated_at ? String(row.updated_at) : undefined,
    })),
    notices: notices.rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      content: row.content,
      notice_type: row.notice_type,
      priority: row.priority,
      publisher_id: Number(row.publisher_id),
      publish_date: String(row.publish_date),
      expiry_date: row.expiry_date ? String(row.expiry_date).slice(0, 10) : undefined,
      is_top: Boolean(row.is_top),
      status: row.status,
      read_by: Array.isArray(row.read_by) ? row.read_by.map((item: unknown) => Number(item)) : [],
    })),
    studyFiles: studyFiles.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      fileName: row.file_name,
      fileSize: Number(row.file_size),
      mimeType: row.mime_type,
      uploadedBy: row.uploaded_by,
      uploadedAt: String(row.uploaded_at),
      storedFileName: row.stored_file_name,
      relativePath: row.relative_path,
    })),
  });
}

async function clearDatabase(db: DatabaseExecutor) {
  await db.query('DELETE FROM study_files');
  await db.query('DELETE FROM notices');
  await db.query('DELETE FROM meetings');
  await db.query('DELETE FROM activists');
  await db.query('DELETE FROM members');
  await db.query('DELETE FROM branches');
}

async function writeStoreToDatabase(db: DatabaseExecutor, payload: StoreData) {
  const data = normalizeStore(payload);
  const userBranchRefs = await db.query<{ id: number; branch_id: number | null }>(
    'SELECT id, branch_id FROM users'
  );
  await clearDatabase(db);

  for (const branch of data.branches) {
    await db.query(
      `
        INSERT INTO branches (
          id, name, code, description, establish_date, renewal_reminder_date,
          secretary_id, secretary_name, status, contact_phone, remark, committee_members
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
      `,
      [
        branch.id,
        branch.name,
        branch.code,
        branch.description,
        branch.establish_date,
        branch.renewal_reminder_date,
        branch.secretary_id ?? null,
        branch.secretary_name,
        branch.status,
        branch.contact_phone ?? '',
        branch.remark ?? '',
        toJson(branch.committee_members),
      ]
    );
  }

  for (const member of data.members) {
    await db.query(
      `
        INSERT INTO members (
          id, name, gender, birthday, department, position, political_status,
          join_date, regular_date, last_fee_month, status, branch_id, user_id,
          phone, email, remarks, avatar_url
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      `,
      [
        member.id,
        member.name,
        member.gender,
        toDateValue(member.birthday),
        member.department,
        member.position,
        member.political_status,
        member.join_date,
        toDateValue(member.regular_date),
        member.last_fee_month,
        member.status,
        member.branch_id,
        member.user_id ?? null,
        member.phone,
        member.email,
        member.remarks,
        member.avatar_url,
      ]
    );
  }

  for (const activist of data.activists) {
    await db.query(
      `
        INSERT INTO activists (
          id, branch_id, name, gender, nation, birthday, education, application_date, talk_date
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        activist.id,
        activist.branch_id,
        activist.name,
        activist.gender,
        activist.nation,
        toDateValue(activist.birthday),
        activist.education,
        activist.application_date,
        activist.talk_date,
      ]
    );
  }

  for (const meeting of data.meetings) {
    await db.query(
      `
        INSERT INTO meetings (
          id, title, meeting_type, meeting_date, location, status, moderator,
          lecturer, lecturer_title, subject, attendees, absentees,
          meeting_categories, topics, meeting_details, attachments,
          branch_id, created_by, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15,$16::jsonb,$17,$18,$19,$20)
      `,
      [
        meeting.id,
        meeting.title,
        meeting.meeting_type,
        meeting.meeting_date,
        meeting.location,
        meeting.status,
        meeting.moderator,
        meeting.lecturer,
        meeting.lecturer_title,
        meeting.subject,
        toJson(meeting.attendees),
        toJson(meeting.absentees),
        toJson(meeting.meeting_categories),
        meeting.topics,
        meeting.meeting_details,
        toJson(meeting.attachments),
        meeting.branch_id,
        meeting.created_by,
        meeting.created_at,
        meeting.updated_at ?? null,
      ]
    );
  }

  for (const notice of data.notices) {
    await db.query(
      `
        INSERT INTO notices (
          id, title, content, notice_type, priority, publisher_id,
          publish_date, expiry_date, is_top, status, read_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
      `,
      [
        notice.id,
        notice.title,
        notice.content,
        notice.notice_type,
        notice.priority,
        notice.publisher_id,
        notice.publish_date,
        toDateValue(notice.expiry_date || ''),
        notice.is_top,
        notice.status,
        toJson(notice.read_by),
      ]
    );
  }

  for (const file of data.studyFiles) {
    await db.query(
      `
        INSERT INTO study_files (
          id, title, description, file_name, file_size, mime_type,
          uploaded_by, uploaded_at, stored_file_name, relative_path
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        file.id,
        file.title,
        file.description,
        file.fileName,
        file.fileSize,
        file.mimeType,
        file.uploadedBy,
        file.uploadedAt,
        file.storedFileName,
        file.relativePath,
      ]
    );
  }

  for (const userRef of userBranchRefs.rows) {
    if (!userRef.branch_id) {
      continue;
    }

    await db.query(
      `
        UPDATE users
        SET branch_id = $2, updated_at = NOW()
        WHERE id = $1
          AND EXISTS (SELECT 1 FROM branches WHERE id = $2)
      `,
      [userRef.id, userRef.branch_id]
    );
  }
}

export async function readStore(): Promise<StoreData> {
  if (!isDatabaseEnabled()) {
    ensureLocalDataFile();
    return normalizeStore(JSON.parse(readFileSync(DB_FILE, 'utf8')) as Partial<StoreData>);
  }

  const pool = getDatabasePool();
  if (!pool) {
    return deepClone(DEFAULT_STORE);
  }

  await ensureDatabaseSchema(pool);
  return readStoreFromDatabase(pool);
}

export async function writeStore(payload: StoreData) {
  const data = normalizeStore(payload);

  if (!isDatabaseEnabled()) {
    ensureLocalDataFile();
    writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return;
  }

  const pool = getDatabasePool();
  if (!pool) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureDatabaseSchema(client);
    await writeStoreToDatabase(client, data);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateStore<T>(updater: (data: StoreData) => T | Promise<T>): Promise<T> {
  if (!isDatabaseEnabled()) {
    const current = await readStore();
    const result = await updater(current);
    await writeStore(current);
    return result;
  }

  const pool = getDatabasePool();
  if (!pool) {
    const fallback = await readStore();
    const result = await updater(fallback);
    await writeStore(fallback);
    return result;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [STORE_LOCK_KEY]);
    await ensureDatabaseSchema(client);

    const current = await readStoreFromDatabase(client);
    const result = await updater(current);
    await writeStoreToDatabase(client, current);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function findBranchById(data: StoreData, branchId: number) {
  return data.branches.find((branch) => branch.id === branchId);
}

export function findBranchByName(data: StoreData, branchName: string) {
  return data.branches.find((branch) => branch.name === branchName);
}

export function getNextNumericId(items: Array<{ id: number }>) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export function toBranchView(branch: BranchRecord, data: StoreData) {
  const members = data.members.filter((member) => member.branch_id === branch.id);
  const activists = data.activists.filter((activist) => activist.branch_id === branch.id);

  return {
    ...deepClone(branch),
    secretary_name: branch.secretary_name || getUserDisplayName(branch.secretary_id),
    member_count: members.length,
    probationary_count: members.filter((member) => member.status === 'probationary').length,
    activist_count: activists.length,
    applicant_count: activists.length,
  };
}

export function toMemberView(member: MemberRecord, data: StoreData) {
  const branch = findBranchById(data, member.branch_id);
  return {
    ...deepClone(member),
    branch_name: branch?.name ?? '未分配支部',
  };
}

export function toMeetingView(meeting: MeetingRecord, data: StoreData) {
  const branch = findBranchById(data, meeting.branch_id);

  return {
    ...deepClone(meeting),
    attendee_count: meeting.attendees.length,
    branch_name: branch?.name ?? '未分配支部',
    creator_name: getUserDisplayName(meeting.created_by),
  };
}

export function toNoticeView(notice: NoticeRecord, userId?: number) {
  return {
    ...deepClone(notice),
    publisher_name: getUserDisplayName(notice.publisher_id),
    read_count: notice.read_by.length,
    is_read: userId ? notice.read_by.includes(userId) : false,
  };
}

export type {
  ActivistRecord,
  BranchRecord,
  MeetingRecord,
  MemberRecord,
  NoticeRecord,
  StoreData,
  StudyFileRecord,
};

export { DEFAULT_STORE, getCurrentMonth, getLastMonth };
