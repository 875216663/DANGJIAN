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
  2: { id: 2, name: '李委员', role: 'branch_secretary', branch_id: 1 },
  3: { id: 3, name: '王纪检', role: 'party_inspection', branch_id: 2 },
  4: { id: 4, name: '党委管理员', role: 'party_committee' },
};

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
      name: '第一党支部',
      code: 'B001',
      description: '负责人力资源、财务部门的党建工作',
      establish_date: '2020-01-15',
      renewal_reminder_date: '2026-12-15',
      secretary_id: 1,
      secretary_name: '张书记',
      status: 'active',
      committee_members: [
        { position: '书记', name: '张书记' },
        { position: '组织委员', name: '王委员' },
        { position: '宣传委员', name: '赵委员' },
      ],
    },
    {
      id: 2,
      name: '第二党支部',
      code: 'B002',
      description: '负责技术研发、生产运营部门的党建工作',
      establish_date: '2020-03-20',
      renewal_reminder_date: '2026-10-20',
      secretary_id: 3,
      secretary_name: '王纪检',
      status: 'active',
      committee_members: [
        { position: '书记', name: '王纪检' },
        { position: '组织委员', name: '刘委员' },
        { position: '宣传委员', name: '陈委员' },
        { position: '纪检委员', name: '杨委员' },
      ],
    },
  ],
  members: [
    {
      id: 1,
      name: '钱党员',
      gender: '男',
      birthday: '1985-06-15',
      department: '人力资源部',
      position: '经理',
      political_status: '中共党员',
      join_date: '2015-07-01',
      regular_date: '2016-07-01',
      last_fee_month: '2026-04',
      status: 'active',
      branch_id: 1,
      phone: '13800000005',
      email: 'qian@example.com',
      remarks: '负责支部党员发展材料归档。',
      avatar_url: '',
    },
    {
      id: 2,
      name: '孙工程师',
      gender: '女',
      birthday: '1990-09-20',
      department: '技术研发部',
      position: '高级工程师',
      political_status: '预备党员',
      join_date: '2023-11-01',
      regular_date: '2026-06-30',
      last_fee_month: '2026-03',
      status: 'probationary',
      branch_id: 2,
      phone: '13800000011',
      email: 'sun@example.com',
      remarks: '需要在本季度完成转正材料复核。',
      avatar_url: '',
    },
    {
      id: 3,
      name: '周经理',
      gender: '男',
      birthday: '1978-03-10',
      department: '生产运营部',
      position: '部门经理',
      political_status: '中共党员',
      join_date: '2010-05-01',
      regular_date: '2011-05-01',
      last_fee_month: '2026-01',
      status: 'active',
      branch_id: 2,
      phone: '13800000012',
      email: 'zhou@example.com',
      remarks: '党费缴纳存在滞后，需要重点跟进。',
      avatar_url: '',
    },
    {
      id: 4,
      name: '吴员工',
      gender: '女',
      birthday: '1995-12-05',
      department: '技术研发部',
      position: '工程师',
      political_status: '中共党员',
      join_date: '2020-06-01',
      regular_date: '2021-06-01',
      last_fee_month: '2026-04',
      status: 'active',
      branch_id: 2,
      phone: '13800000013',
      email: 'wu@example.com',
      remarks: '',
      avatar_url: '',
    },
    {
      id: 5,
      name: '郑专员',
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
      phone: '13800000014',
      email: 'zheng@example.com',
      remarks: '',
      avatar_url: '',
    },
    {
      id: 6,
      name: '冯主管',
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
      phone: '13800000015',
      email: 'feng@example.com',
      remarks: '支部会议组织经验丰富。',
      avatar_url: '',
    },
  ],
  activists: [
    {
      id: 101,
      branch_id: 1,
      name: '王积极',
      gender: '男',
      nation: '汉族',
      birthday: '1992-05-20',
      education: '大学本科',
      application_date: '2024-01-15',
      talk_date: '2024-02-10',
    },
    {
      id: 102,
      branch_id: 1,
      name: '赵积极',
      gender: '女',
      nation: '汉族',
      birthday: '1995-08-10',
      education: '硕士研究生',
      application_date: '2024-03-20',
      talk_date: '2024-04-05',
    },
    {
      id: 201,
      branch_id: 2,
      name: '刘积极',
      gender: '男',
      nation: '汉族',
      birthday: '1990-11-05',
      education: '大学本科',
      application_date: '2023-10-15',
      talk_date: '2023-11-20',
    },
    {
      id: 202,
      branch_id: 2,
      name: '陈积极',
      gender: '女',
      nation: '汉族',
      birthday: '1993-03-25',
      education: '大学专科',
      application_date: '2023-12-10',
      talk_date: '2024-01-15',
    },
  ],
  meetings: [
    {
      id: 1,
      title: '2026年第二季度党员大会',
      meeting_type: '支部大会',
      meeting_date: '2026-04-18',
      location: '党员活动室',
      status: 'planned',
      moderator: '张书记',
      lecturer: '',
      lecturer_title: '',
      subject: '',
      attendees: [],
      absentees: [],
      meeting_categories: ['集中学习', '党员发展'],
      topics: '学习党章党规，审议积极分子培养计划',
      meeting_details: '会议拟围绕季度党建重点任务和党员发展工作进行安排部署。',
      attachments: [],
      branch_id: 1,
      created_by: 1,
      created_at: '2026-04-10T10:00:00.000Z',
    },
    {
      id: 2,
      title: '支委会工作例会',
      meeting_type: '支部委员会',
      meeting_date: '2026-04-20',
      location: '党委会议室',
      status: 'planned',
      moderator: '王纪检',
      lecturer: '',
      lecturer_title: '',
      subject: '',
      attendees: [],
      absentees: [],
      meeting_categories: [],
      topics: '讨论党费收缴、组织生活会准备工作',
      meeting_details: '支委会将就二季度重点工作进行统筹。',
      attachments: [],
      branch_id: 2,
      created_by: 3,
      created_at: '2026-04-11T09:00:00.000Z',
    },
    {
      id: 3,
      title: '专题党课学习会',
      meeting_type: '党课',
      meeting_date: '2026-04-16',
      location: '报告厅',
      status: 'ongoing',
      moderator: '',
      lecturer: '党委管理员',
      lecturer_title: '党委委员',
      subject: '深入学习中央八项规定精神',
      attendees: [{ name: '钱党员' }, { name: '郑专员' }, { name: '冯主管' }],
      absentees: [{ name: '孙工程师', reason: '出差' }],
      meeting_categories: [],
      topics: '',
      meeting_details: '围绕作风建设常态化开展专题党课和交流研讨。',
      attachments: [],
      branch_id: 1,
      created_by: 4,
      created_at: '2026-04-09T15:00:00.000Z',
    },
    {
      id: 4,
      title: '2026年第一季度组织生活会',
      meeting_type: '支部大会',
      meeting_date: '2026-03-28',
      location: '党员活动室',
      status: 'completed',
      moderator: '张书记',
      lecturer: '',
      lecturer_title: '',
      subject: '',
      attendees: [{ name: '钱党员' }, { name: '郑专员' }, { name: '冯主管' }],
      absentees: [{ name: '周经理', reason: '值班' }],
      meeting_categories: ['组织生活会'],
      topics: '开展批评与自我批评，落实问题整改',
      meeting_details: '会议已完成对照检查、民主评议和整改部署。',
      attachments: [],
      branch_id: 1,
      created_by: 1,
      created_at: '2026-03-28T14:00:00.000Z',
    },
  ],
  notices: [
    {
      id: 1,
      title: '关于开展二季度主题党日活动的通知',
      content: '请各支部于4月底前组织完成主题党日活动，并及时录入会议记录。',
      notice_type: '通知',
      priority: 'high',
      publisher_id: 1,
      publish_date: '2026-04-12T09:00:00.000Z',
      is_top: true,
      status: 'published',
      read_by: [1],
    },
    {
      id: 2,
      title: '党员发展材料提报提醒',
      content: '请涉及积极分子培养的支部在本周内完成材料提报和预审。',
      notice_type: '提醒',
      priority: 'normal',
      publisher_id: 3,
      publish_date: '2026-04-11T10:30:00.000Z',
      is_top: false,
      status: 'published',
      read_by: [],
    },
    {
      id: 3,
      title: '学习教育资料已更新',
      content: '学习中心已新增中央最新文件解读，请及时下载学习。',
      notice_type: '学习',
      priority: 'normal',
      publisher_id: 4,
      publish_date: '2026-04-09T08:00:00.000Z',
      is_top: false,
      status: 'published',
      read_by: [1, 2],
    },
  ],
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
  return {
    branches: Array.isArray(value?.branches) ? value.branches : deepClone(DEFAULT_STORE.branches),
    members: Array.isArray(value?.members) ? value.members : deepClone(DEFAULT_STORE.members),
    activists: Array.isArray(value?.activists) ? value.activists : deepClone(DEFAULT_STORE.activists),
    meetings: Array.isArray(value?.meetings) ? value.meetings : deepClone(DEFAULT_STORE.meetings),
    notices: Array.isArray(value?.notices) ? value.notices : deepClone(DEFAULT_STORE.notices),
    studyFiles: Array.isArray(value?.studyFiles) ? value.studyFiles : deepClone(DEFAULT_STORE.studyFiles),
  };
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

    return normalizeStore((result.rows[0]?.payload ?? DEFAULT_STORE) as Partial<StoreData>);
  }

  ensureDataFile();
  const content = readFileSync(DB_FILE, 'utf8');
  return normalizeStore(JSON.parse(content) as Partial<StoreData>);
}

export async function writeStore(data: StoreData) {
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
      [STORE_KEY, JSON.stringify(data)]
    );
    return;
  }

  ensureDataFile();
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
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
