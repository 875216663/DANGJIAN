import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { getDatabasePool, isDatabaseEnabled } from '../config/database';

export interface CommitteeMember {
  position: string;
  name: string;
}

export interface BranchRecord {
  id: number;
  name: string;
  code: string;
  description: string;
  establish_date: string;
  renewal_reminder_date: string;
  secretary_id?: number;
  secretary_name: string;
  status: string;
  committee_members: CommitteeMember[];
}

export interface MemberRecord {
  id: number;
  name: string;
  gender: string;
  birthday: string;
  department: string;
  position: string;
  political_status: string;
  join_date: string;
  regular_date: string;
  last_fee_month: string;
  status: string;
  branch_id: number;
  phone: string;
  email: string;
  remarks: string;
  avatar_url: string;
}

export interface ActivistRecord {
  id: number;
  branch_id: number;
  name: string;
  gender: string;
  nation: string;
  birthday: string;
  education: string;
  application_date: string;
  talk_date: string;
}

export interface MeetingParticipant {
  name: string;
  reason?: string;
}

export interface MeetingRecord {
  id: number;
  title: string;
  meeting_type: string;
  meeting_date: string;
  location: string;
  status: string;
  moderator: string;
  lecturer: string;
  lecturer_title: string;
  subject: string;
  attendees: MeetingParticipant[];
  absentees: MeetingParticipant[];
  meeting_categories: string[];
  topics: string;
  meeting_details: string;
  attachments: string[];
  branch_id: number;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface NoticeRecord {
  id: number;
  title: string;
  content: string;
  notice_type: string;
  priority: string;
  publisher_id: number;
  publish_date: string;
  expiry_date?: string;
  is_top: boolean;
  status: string;
  read_by: number[];
}

export interface StudyFileRecord {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  storedFileName: string;
  relativePath: string;
}

export interface StoreData {
  branches: BranchRecord[];
  members: MemberRecord[];
  activists: ActivistRecord[];
  meetings: MeetingRecord[];
  notices: NoticeRecord[];
  studyFiles: StudyFileRecord[];
}

export const USER_DIRECTORY: Record<number, { id: number; name: string; role: string; branch_id?: number }> = {
  1: { id: 1, name: '张书记', role: 'party_committee', branch_id: 1 },
  2: { id: 2, name: '李委员', role: 'party_committee', branch_id: 1 },
  3: { id: 3, name: '王纪检', role: 'party_committee', branch_id: 2 },
  4: { id: 4, name: '党委管理员', role: 'party_committee' },
};

export const DEMO_ACCOUNT_DIRECTORY = [
  {
    user_id: 1,
    username: 'leader01',
    password: '123456',
    description: '默认演示账号，可查看和维护全部基础信息。',
  },
  {
    user_id: 2,
    username: 'office01',
    password: '123456',
    description: '党委办公室账号，适合日常党员档案维护演示。',
  },
  {
    user_id: 3,
    username: 'branch01',
    password: '123456',
    description: '基层支部账号，用于展示不同支部的数据视角。',
  },
  {
    user_id: 4,
    username: 'admin01',
    password: '123456',
    description: '系统管理员账号，用于完整流程演示。',
  },
] as const;

const DATA_DIR = resolve(process.cwd(), 'data');
const DB_FILE = resolve(DATA_DIR, 'local-db.json');
const STORE_KEY = 'default';
const STORE_TABLE = getStoreTableName();

function getStoreTableName() {
  const candidate = process.env.DB_STORE_TABLE?.trim();
  return candidate && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(candidate)
    ? candidate
    : 'party_app_store';
}

const DEFAULT_STORE: StoreData = {
  branches: [
    {
      id: 1,
      name: '综合管理党支部',
      code: 'B001',
      description: '负责人力资源、综合行政、财务等基础管理条线的党建信息维护。',
      establish_date: '2020-01-15',
      renewal_reminder_date: '2026-12-15',
      secretary_id: 1,
      secretary_name: '张书记',
      status: 'active',
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
      establish_date: '2020-03-20',
      renewal_reminder_date: '2026-10-20',
      secretary_id: 3,
      secretary_name: '王纪检',
      status: 'active',
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

function ensureDataFile() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
  }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyStoreMigrations(store: StoreData): StoreData {
  const nextStore = deepClone(store);

  const branchSeedById: Record<number, Partial<BranchRecord> & { legacyName: string }> = {
    1: {
      legacyName: '第一党支部',
      name: '综合管理党支部',
      description: '负责人力资源、综合行政、财务等基础管理条线的党建信息维护。',
      committee_members: [
        { position: '书记', name: '张书记' },
        { position: '组织委员', name: '李委员' },
      ],
    },
    2: {
      legacyName: '第二党支部',
      name: '研发运营党支部',
      description: '负责技术研发、产品运营及项目实施条线的党员与支部基础信息管理。',
      committee_members: [
        { position: '书记', name: '王纪检' },
        { position: '组织委员', name: '周主管' },
      ],
    },
  };

  nextStore.branches = nextStore.branches.map((branch) => {
    const branchSeed = branchSeedById[branch.id];
    if (!branchSeed || branch.name !== branchSeed.legacyName) {
      return branch;
    }

    return {
      ...branch,
      name: branchSeed.name || branch.name,
      description: branchSeed.description || branch.description,
      committee_members: branchSeed.committee_members || branch.committee_members,
    };
  });

  const legacyMemberSeeds: Record<
    string,
    Partial<MemberRecord> & { department?: string; position?: string; remarks?: string }
  > = {
    钱党员: {
      name: '陈晓明',
      birthday: '1986-06-15',
      department: '综合管理部',
      position: '部门经理',
      join_date: '2014-07-01',
      regular_date: '2015-07-01',
      phone: '13800000001',
      email: 'chenxm@example.com',
      remarks: '负责综合管理条线党员档案维护。',
    },
    孙工程师: {
      name: '刘雨桐',
      birthday: '1992-09-20',
      department: '产品研发部',
      position: '高级工程师',
      phone: '13800000002',
      email: 'liuyt@example.com',
      remarks: '需要在本季度内完成转正材料复核。',
    },
    周经理: {
      name: '周建国',
      department: '运营管理部',
      position: '运营经理',
      phone: '13800000003',
      email: 'zhoujg@example.com',
    },
    吴员工: {
      name: '林思雨',
      department: '产品研发部',
      phone: '13800000004',
      email: 'linsy@example.com',
    },
    郑专员: {
      name: '何文博',
      phone: '13800000005',
      email: 'hewb@example.com',
    },
    冯主管: {
      name: '赵婷',
      phone: '13800000006',
      email: 'zhaoting@example.com',
    },
  };

  nextStore.members = nextStore.members.map((member) => {
    const memberSeed = legacyMemberSeeds[member.name];
    if (!memberSeed) {
      return member;
    }

    return {
      ...member,
      ...memberSeed,
    };
  });

  const legacyActivistNames = ['王积极', '赵积极', '刘积极', '陈积极'];
  if (
    nextStore.activists.length > 0 &&
    nextStore.activists.every((item) => legacyActivistNames.includes(item.name))
  ) {
    nextStore.activists = [];
  }

  const legacyMeetingTitles = [
    '2026年第二季度党员大会',
    '支委会工作例会',
    '专题党课学习会',
    '2026年第一季度组织生活会',
  ];
  if (
    nextStore.meetings.length > 0 &&
    nextStore.meetings.every((item) => legacyMeetingTitles.includes(item.title))
  ) {
    nextStore.meetings = [];
  }

  const legacyNoticeTitles = [
    '关于开展二季度主题党日活动的通知',
    '党员发展材料提报提醒',
    '学习教育资料已更新',
  ];
  if (
    nextStore.notices.length > 0 &&
    nextStore.notices.every((item) => legacyNoticeTitles.includes(item.title))
  ) {
    nextStore.notices = [];
  }

  return nextStore;
}

function getInitialStoreSeed() {
  if (!existsSync(DB_FILE)) {
    return deepClone(DEFAULT_STORE);
  }

  try {
    const content = readFileSync(DB_FILE, 'utf8');
    return normalizeStore(JSON.parse(content) as Partial<StoreData>);
  } catch (error) {
    console.error('Failed to read local data seed, falling back to default store:', error);
    return deepClone(DEFAULT_STORE);
  }
}

function normalizeStore(value: Partial<StoreData> | null | undefined): StoreData {
  const normalized = {
    branches: Array.isArray(value?.branches) ? value.branches : deepClone(DEFAULT_STORE.branches),
    members: Array.isArray(value?.members) ? value.members : deepClone(DEFAULT_STORE.members),
    activists: Array.isArray(value?.activists) ? value.activists : deepClone(DEFAULT_STORE.activists),
    meetings: Array.isArray(value?.meetings) ? value.meetings : deepClone(DEFAULT_STORE.meetings),
    notices: Array.isArray(value?.notices) ? value.notices : deepClone(DEFAULT_STORE.notices),
    studyFiles: Array.isArray(value?.studyFiles) ? value.studyFiles : deepClone(DEFAULT_STORE.studyFiles),
  };

  return applyStoreMigrations(normalized);
}

let ensureDbStorePromise: Promise<void> | null = null;

async function ensureDatabaseStore() {
  if (!isDatabaseEnabled()) {
    return;
  }

  if (!ensureDbStorePromise) {
    ensureDbStorePromise = (async () => {
      const pool = getDatabasePool();
      if (!pool) {
        return;
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${STORE_TABLE} (
          store_key TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(
        `
          INSERT INTO ${STORE_TABLE} (store_key, payload, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (store_key) DO NOTHING
        `,
        [STORE_KEY, JSON.stringify(getInitialStoreSeed())]
      );
    })().catch((error) => {
      ensureDbStorePromise = null;
      throw error;
    });
  }

  await ensureDbStorePromise;
}

export async function readStore(): Promise<StoreData> {
  if (isDatabaseEnabled()) {
    await ensureDatabaseStore();
    const pool = getDatabasePool();

    if (!pool) {
      return normalizeStore(DEFAULT_STORE);
    }

    const result = await pool.query(
      `SELECT payload FROM ${STORE_TABLE} WHERE store_key = $1 LIMIT 1`,
      [STORE_KEY]
    );
    const rawPayload = (result.rows[0]?.payload ?? DEFAULT_STORE) as Partial<StoreData>;
    const normalized = normalizeStore(rawPayload);

    if (JSON.stringify(rawPayload) !== JSON.stringify(normalized)) {
      await pool.query(
        `
          INSERT INTO ${STORE_TABLE} (store_key, payload, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (store_key)
          DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
        `,
        [STORE_KEY, JSON.stringify(normalized)]
      );
    }

    return normalized;
  }

  ensureDataFile();
  const content = readFileSync(DB_FILE, 'utf8');
  const rawPayload = JSON.parse(content) as Partial<StoreData>;
  const normalized = normalizeStore(rawPayload);

  if (JSON.stringify(rawPayload) !== JSON.stringify(normalized)) {
    writeFileSync(DB_FILE, JSON.stringify(normalized, null, 2), 'utf8');
  }

  return normalized;
}

export async function writeStore(data: StoreData) {
  const normalized = normalizeStore(data);

  if (isDatabaseEnabled()) {
    await ensureDatabaseStore();
    const pool = getDatabasePool();

    if (!pool) {
      return;
    }

    await pool.query(
      `
        INSERT INTO ${STORE_TABLE} (store_key, payload, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (store_key)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
      `,
      [STORE_KEY, JSON.stringify(normalized)]
    );
    return;
  }

  ensureDataFile();
  writeFileSync(DB_FILE, JSON.stringify(normalized, null, 2), 'utf8');
}

export async function updateStore<T>(updater: (data: StoreData) => T | Promise<T>): Promise<T> {
  if (isDatabaseEnabled()) {
    await ensureDatabaseStore();
    const pool = getDatabasePool();

    if (!pool) {
      const data = await readStore();
      const result = await updater(data);
      await writeStore(data);
      return result;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const current = await client.query(
        `SELECT payload FROM ${STORE_TABLE} WHERE store_key = $1 FOR UPDATE`,
        [STORE_KEY]
      );

      const data = normalizeStore((current.rows[0]?.payload ?? DEFAULT_STORE) as Partial<StoreData>);
      const result = await updater(data);

      await client.query(
        `
          INSERT INTO ${STORE_TABLE} (store_key, payload, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (store_key)
          DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
        `,
        [STORE_KEY, JSON.stringify(data)]
      );

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  const data = await readStore();
  const result = await updater(data);
  await writeStore(data);
  return result;
}

export function getUserDisplayName(userId?: number) {
  if (!userId) {
    return '系统用户';
  }

  return USER_DIRECTORY[userId]?.name ?? `用户${userId}`;
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

export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function getLastMonth() {
  const current = new Date();
  current.setMonth(current.getMonth() - 1);
  return current.toISOString().slice(0, 7);
}

export function toBranchView(branch: BranchRecord, data: StoreData) {
  const members = data.members.filter((member) => member.branch_id === branch.id);
  const activists = data.activists.filter((activist) => activist.branch_id === branch.id);

  return {
    ...deepClone(branch),
    member_count: members.length,
    probationary_count: members.filter((member) => member.status === 'probationary').length,
    activist_count: activists.length,
    applicant_count: activists.length + 1,
    secretary_name: branch.secretary_name || getUserDisplayName(branch.secretary_id),
    换届提醒日期: branch.renewal_reminder_date,
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
