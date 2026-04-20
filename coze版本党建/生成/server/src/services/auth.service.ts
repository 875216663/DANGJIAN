import { compareSync } from 'bcryptjs';
import { getDatabasePool, isDatabaseEnabled } from '../config/database';
import { env } from '../config/env';
import {
  DEMO_ACCOUNT_SEEDS,
  toUserView,
  type AuthUserRecord,
  type DemoAccountRecord,
} from '../models/auth.model';
import { readStore } from '../models/store.model';
import type { CurrentUserContext } from '../middlewares/auth.middleware';
import { AppError } from '../utils/app-error';
import { createAuthToken } from '../utils/token';
import { getTokenExpiryHours } from '../middlewares/auth.middleware';

interface UserRow {
  id: number | string;
  username: string;
  name: string;
  mobile: string | null;
  status: string;
  is_demo: boolean;
  description: string | null;
  branch_id: number | null;
  branch_name: string | null;
  member_id: number | null;
  role_code: string;
}

function getStorageMode() {
  return isDatabaseEnabled() ? 'database' : 'local-file';
}

// 将数据库记录转换为统一的前端用户视图结构。
function mapUserRow(row: UserRow, store?: Awaited<ReturnType<typeof readStore>>) {
  return toUserView(
    {
      id: Number(row.id),
      username: row.username,
      name: row.name,
      role: row.role_code as AuthUserRecord['role'],
      branch_id: row.branch_id ? Number(row.branch_id) : undefined,
      branch_name: row.branch_name ?? undefined,
      member_id: row.member_id ? Number(row.member_id) : undefined,
      mobile: row.mobile ?? '',
      status: row.status,
      is_demo: Boolean(row.is_demo),
    },
    store
  );
}

// 从数据库读取全部可登录用户。
async function listUsersFromDatabase() {
  await readStore();
  const pool = getDatabasePool();
  if (!pool) {
    return [];
  }

  const result = await pool.query<UserRow>(`
    SELECT
      u.id,
      u.username,
      u.name,
      u.mobile,
      u.status,
      u.is_demo,
      u.description,
      u.branch_id,
      b.name AS branch_name,
      m.id AS member_id,
      r.code AS role_code
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    LEFT JOIN branches b ON b.id = u.branch_id
    LEFT JOIN members m ON m.user_id = u.id
    WHERE u.status = 'active'
    ORDER BY u.is_demo DESC, u.id ASC
  `);

  return result.rows.map((row) => mapUserRow(row));
}

// 从数据库读取演示账号，并补充默认密码与描述信息。
async function listDemoAccountsFromDatabase() {
  await readStore();
  const pool = getDatabasePool();
  if (!pool) {
    return [];
  }

  const result = await pool.query<UserRow>(`
    SELECT
      u.id,
      u.username,
      u.name,
      u.mobile,
      u.status,
      u.is_demo,
      u.description,
      u.branch_id,
      b.name AS branch_name,
      m.id AS member_id,
      r.code AS role_code
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    LEFT JOIN branches b ON b.id = u.branch_id
    LEFT JOIN members m ON m.user_id = u.id
    WHERE u.status = 'active' AND u.is_demo = TRUE
    ORDER BY u.id ASC
  `);

  return result.rows.map((row) => {
    const user = mapUserRow(row);
    return {
      username: user.username,
      password: env.DEFAULT_LOGIN_PASSWORD,
      description:
        DEMO_ACCOUNT_SEEDS.find((seed) => seed.username === user.username)?.description ??
        row.description ??
        '系统演示账号',
      user,
    } satisfies DemoAccountRecord;
  });
}

// 本地文件模式下，根据预置种子拼出可登录账号。
function buildFallbackAccounts(store: Awaited<ReturnType<typeof readStore>>) {
  return DEMO_ACCOUNT_SEEDS.map((seed, index) => {
    const branch = seed.useFirstBranch ? store.branches[0] : undefined;
    const member = seed.bindFirstBranchMember
      ? store.members.find((item) => item.branch_id === branch?.id)
      : undefined;

    const user = toUserView(
      {
        id: index + 1,
        username: seed.username,
        name: seed.name,
        role: seed.role,
        branch_id: branch?.id,
        branch_name: branch?.name,
        member_id: member?.id,
        is_demo: true,
      },
      store
    );

    return {
      username: seed.username,
      password: env.DEFAULT_LOGIN_PASSWORD,
      description: seed.description,
      user,
    } satisfies DemoAccountRecord;
  });
}

// 按用户 ID 读取单个用户，用于会话恢复。
async function getUserById(userId: number) {
  await readStore();
  const pool = getDatabasePool();
  if (!pool) {
    return null;
  }

  const result = await pool.query<UserRow>(
    `
      SELECT
        u.id,
        u.username,
        u.name,
        u.mobile,
        u.status,
        u.is_demo,
        u.description,
        u.branch_id,
        b.name AS branch_name,
        m.id AS member_id,
        r.code AS role_code
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      LEFT JOIN branches b ON b.id = u.branch_id
      LEFT JOIN members m ON m.user_id = u.id
      WHERE u.id = $1 AND u.status = 'active'
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

// 返回可用于前端选择的用户列表，同时附带默认用户 ID 和存储模式。
export async function listUsers() {
  if (!isDatabaseEnabled()) {
    const store = await readStore();
    const users = buildFallbackAccounts(store).map((account) => account.user);
    return {
      users,
      defaultUserId: users[0]?.id,
      storage: getStorageMode(),
    };
  }

  const users = await listUsersFromDatabase();
  return {
    users,
    defaultUserId: users[0]?.id,
    storage: getStorageMode(),
  };
}

// 返回演示账号列表，便于前端快速展示可登录账号。
export async function listDemoAccounts() {
  if (!isDatabaseEnabled()) {
    return {
      accounts: buildFallbackAccounts(await readStore()),
      storage: getStorageMode(),
    };
  }

  return {
    accounts: await listDemoAccountsFromDatabase(),
    storage: getStorageMode(),
  };
}

// 登录逻辑根据不同存储模式分别处理，最终都会返回 token 和用户信息。
export async function login(username: string, password: string) {
  if (!isDatabaseEnabled()) {
    const store = await readStore();
    const matched = buildFallbackAccounts(store).find(
      (account) => account.username === username && account.password === password
    );

    if (!matched) {
      throw new AppError(401, '账号或密码错误');
    }

    return {
      token: createAuthToken({
        userId: matched.user.id,
        role: matched.user.role,
        branchId: matched.user.branch_id,
        memberId: matched.user.member_id,
        username: matched.user.username,
      }),
      user: matched.user,
      expiresInHours: getTokenExpiryHours(),
      storage: getStorageMode(),
    };
  }

  await readStore();
  const pool = getDatabasePool();
  if (!pool) {
    throw new AppError(500, '数据库连接不可用');
  }

  const result = await pool.query<
    UserRow & {
      password_hash: string;
    }
  >(
    `
      SELECT
        u.id,
        u.username,
        u.name,
        u.mobile,
        u.status,
        u.is_demo,
        u.description,
        u.branch_id,
        u.password_hash,
        b.name AS branch_name,
        m.id AS member_id,
        r.code AS role_code
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      LEFT JOIN branches b ON b.id = u.branch_id
      LEFT JOIN members m ON m.user_id = u.id
      WHERE u.username = $1 AND u.status = 'active'
      LIMIT 1
    `,
    [username]
  );

  const row = result.rows[0];
  if (!row || !compareSync(password, row.password_hash)) {
    throw new AppError(401, '账号或密码错误');
  }

  const user = mapUserRow(row);
  return {
    token: createAuthToken({
      userId: user.id,
      role: user.role,
      branchId: user.branch_id,
      memberId: user.member_id,
      username: user.username,
    }),
    user,
    expiresInHours: getTokenExpiryHours(),
    storage: getStorageMode(),
  };
}

// 根据 token 中的用户上下文恢复会话信息。
export async function getSession(currentUser: CurrentUserContext) {
  if (!isDatabaseEnabled()) {
    const store = await readStore();
    const fallbackUser = buildFallbackAccounts(store).find(
      (account) => account.user.id === currentUser.userId
    )?.user;

    if (!fallbackUser) {
      throw new AppError(401, '用户会话不存在');
    }

    return {
      user: fallbackUser,
      storage: getStorageMode(),
    };
  }

  const user = await getUserById(currentUser.userId);
  if (!user) {
    throw new AppError(401, '用户会话不存在');
  }

  return {
    user,
    storage: getStorageMode(),
  };
}
