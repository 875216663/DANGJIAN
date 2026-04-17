import { hashSync } from 'bcryptjs';
import type { PoolClient } from 'pg';
import { getDatabasePool, isDatabaseEnabled } from '../config/database';
import { env } from '../config/env';
import {
  findBranchById,
  findBranchByName,
  getNextNumericId,
  readStore,
  toMemberView,
  updateStore,
} from '../models/store.model';
import type { CurrentUserContext } from '../middlewares/auth.middleware';
import { resolveBranchScope } from '../middlewares/auth.middleware';
import { AppError } from '../utils/app-error';
import { buildPaginationMeta, requireEntity } from './store-helper.service';
import {
  canCreateMember,
  canEditMember,
  canViewAllData,
  isPartyMemberRole,
  ROLE_CODES,
  ROLE_LABELS,
} from '../utils/rbac';
import { logger } from '../utils/logger';

interface MemberListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  branch_id?: number;
}

interface MemberMutationPayload {
  name?: string;
  gender?: string;
  birthday?: string;
  department?: string;
  position?: string;
  political_status?: string;
  join_date?: string;
  regular_date?: string;
  last_fee_month?: string;
  status?: string;
  branch_id?: number;
  branch_name?: string;
  phone?: string;
  email?: string;
  remarks?: string;
  avatar_url?: string;
}

function canManageAllBranches(currentUser: CurrentUserContext) {
  return canViewAllData(currentUser.role);
}

function filterMemberViews<T extends { branch_id: number; user_id?: number }>(
  items: T[],
  currentUser: CurrentUserContext,
  requestedBranchId?: number
) {
  if (isPartyMemberRole(currentUser.role)) {
    return items.filter((item) => item.user_id === currentUser.userId);
  }

  const scopedBranchId = resolveBranchScope(currentUser, requestedBranchId);
  if (!scopedBranchId) {
    return items;
  }

  return items.filter((item) => item.branch_id === scopedBranchId);
}

function resolveWritableBranchFromStore(
  store: Awaited<ReturnType<typeof readStore>>,
  currentUser: CurrentUserContext,
  payload: Pick<MemberMutationPayload, 'branch_id' | 'branch_name'>
) {
  if (canManageAllBranches(currentUser)) {
    if (payload.branch_id) {
      return requireEntity(findBranchById(store, payload.branch_id), '所属支部不存在');
    }

    if (payload.branch_name?.trim()) {
      return requireEntity(
        findBranchByName(store, payload.branch_name.trim()),
        '所属支部不存在，请先创建支部'
      );
    }

    throw new AppError(400, '请选择所属党支部');
  }

  if (!currentUser.branchId) {
    throw new AppError(403, '当前账号未绑定党支部，无法新增党员');
  }

  if (
    payload.branch_id &&
    Number(payload.branch_id) !== Number(currentUser.branchId)
  ) {
    throw new AppError(403, '仅可为本支部新增党员');
  }

  if (
    payload.branch_name?.trim() &&
    findBranchById(store, currentUser.branchId)?.name !== payload.branch_name.trim()
  ) {
    throw new AppError(403, '仅可为本支部新增党员');
  }

  return requireEntity(
    findBranchById(store, currentUser.branchId),
    '当前账号绑定的党支部不存在'
  );
}

async function resolveWritableBranchFromDatabase(
  client: PoolClient,
  currentUser: CurrentUserContext,
  payload: Pick<MemberMutationPayload, 'branch_id' | 'branch_name'>
) {
  if (canManageAllBranches(currentUser)) {
    if (payload.branch_id) {
      const branchById = await client.query<{ id: number; name: string }>(
        'SELECT id, name FROM branches WHERE id = $1 LIMIT 1',
        [payload.branch_id]
      );
      if (!branchById.rows[0]) {
        throw new AppError(400, '所属支部不存在');
      }
      return branchById.rows[0];
    }

    if (payload.branch_name?.trim()) {
      const branchByName = await client.query<{ id: number; name: string }>(
        'SELECT id, name FROM branches WHERE name = $1 LIMIT 1',
        [payload.branch_name.trim()]
      );
      if (!branchByName.rows[0]) {
        throw new AppError(400, '所属支部不存在，请先创建支部');
      }
      return branchByName.rows[0];
    }

    throw new AppError(400, '请选择所属党支部');
  }

  if (!currentUser.branchId) {
    throw new AppError(403, '当前账号未绑定党支部，无法新增党员');
  }

  if (
    payload.branch_id &&
    Number(payload.branch_id) !== Number(currentUser.branchId)
  ) {
    throw new AppError(403, '仅可为本支部新增党员');
  }

  const branchResult = await client.query<{ id: number; name: string }>(
    'SELECT id, name FROM branches WHERE id = $1 LIMIT 1',
    [currentUser.branchId]
  );
  const ownBranch = branchResult.rows[0];

  if (!ownBranch) {
    throw new AppError(403, '当前账号绑定的党支部不存在');
  }

  if (payload.branch_name?.trim() && payload.branch_name.trim() !== ownBranch.name) {
    throw new AppError(403, '仅可为本支部新增党员');
  }

  return ownBranch;
}

async function generateUniqueUsername(client: PoolClient, phone?: string) {
  const normalizedPhone = (phone || '').replace(/\D/g, '');
  const baseUsername = normalizedPhone || `party${Date.now().toString().slice(-8)}`;
  let attempt = baseUsername;
  let suffix = 1;

  while (true) {
    const exists = await client.query<{ id: number }>(
      'SELECT id FROM users WHERE username = $1 LIMIT 1',
      [attempt]
    );
    if (exists.rows.length === 0) {
      return attempt;
    }

    attempt = `${baseUsername}${String(suffix).padStart(2, '0')}`;
    suffix += 1;
  }
}

async function readCreatedMemberView(client: PoolClient, memberId: number) {
  const result = await client.query<{
    id: number;
    user_id: number | null;
    name: string;
    gender: string;
    birthday: string | null;
    department: string;
    position: string;
    political_status: string;
    join_date: string;
    regular_date: string | null;
    last_fee_month: string;
    status: string;
    branch_id: number;
    branch_name: string;
    phone: string;
    email: string;
    remarks: string;
    avatar_url: string;
  }>(
    `
      SELECT
        m.id,
        m.user_id,
        m.name,
        m.gender,
        m.birthday,
        m.department,
        m.position,
        m.political_status,
        m.join_date,
        m.regular_date,
        m.last_fee_month,
        m.status,
        m.branch_id,
        b.name AS branch_name,
        m.phone,
        m.email,
        m.remarks,
        m.avatar_url
      FROM members m
      INNER JOIN branches b ON b.id = m.branch_id
      WHERE m.id = $1
      LIMIT 1
    `,
    [memberId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new AppError(404, '党员不存在');
  }

  return {
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
    branch_name: row.branch_name,
    phone: row.phone || '',
    email: row.email || '',
    remarks: row.remarks || '',
    avatar_url: row.avatar_url || '',
  };
}

export async function listMembers(query: MemberListQuery, currentUser: CurrentUserContext) {
  const store = await readStore();
  let members = filterMemberViews(
    store.members.map((member) => toMemberView(member, store)),
    currentUser,
    query.branch_id
  );

  if (query.status) {
    members = members.filter((member) => member.status === query.status);
  }

  if (query.search) {
    const keyword = query.search.toLowerCase();
    members = members.filter((member) =>
      [member.name, member.department, member.position, member.branch_name, member.phone]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }

  const total = members.length;
  const start = (query.page - 1) * query.limit;

  return {
    items: members.slice(start, start + query.limit),
    meta: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getMemberById(id: number, currentUser: CurrentUserContext) {
  const store = await readStore();
  const member = requireEntity(
    store.members.find((item) => item.id === id),
    '党员不存在'
  );

  if (isPartyMemberRole(currentUser.role) && member.user_id !== currentUser.userId) {
    throw new AppError(403, '普通党员仅可查看本人信息');
  }

  const scopedBranchId = resolveBranchScope(currentUser, undefined);
  if (
    scopedBranchId &&
    !canManageAllBranches(currentUser) &&
    !isPartyMemberRole(currentUser.role) &&
    member.branch_id !== scopedBranchId
  ) {
    throw new AppError(403, '无权查看其他支部党员');
  }

  return toMemberView(member, store);
}

export async function exportMembers(
  query: Pick<MemberListQuery, 'status' | 'branch_id'>,
  currentUser: CurrentUserContext
) {
  const store = await readStore();
  let members = filterMemberViews(
    store.members.map((member) => toMemberView(member, store)),
    currentUser,
    query.branch_id
  );

  if (query.status) {
    members = members.filter((member) => member.status === query.status);
  }

  return members;
}

export async function importMembers(
  rows: Array<Record<string, string>>,
  currentUser: CurrentUserContext
) {
  return updateStore((store) => {
    const normalizedRows = rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').trim())
    );

    return normalizedRows.map((row, index) => {
      const name = row['姓名']?.trim();
      if (!name) {
        throw new AppError(400, `第 ${index + 1} 行缺少“姓名”字段`);
      }

      const joinDate = row['入党日期']?.trim();
      if (!joinDate) {
        throw new AppError(400, `第 ${index + 1} 行缺少“入党日期”字段`);
      }

      const branch = resolveWritableBranchFromStore(store, currentUser, {
        branch_name: row['所属支部']?.trim(),
      });

      const member = {
        id: getNextNumericId(store.members),
        user_id: undefined,
        name,
        gender: row['性别']?.trim() || '男',
        birthday: row['出生日期']?.trim() || '',
        department: row['部门']?.trim() || '',
        position: row['职务']?.trim() || '',
        political_status: row['政治面貌']?.trim() || '中共党员',
        join_date: joinDate,
        regular_date: row['转正日期']?.trim() || '',
        last_fee_month: row['党费缴纳年月']?.trim() || '',
        phone: row['联系电话']?.trim() || '',
        email: row['邮箱']?.trim() || '',
        status: row['状态']?.trim() || 'active',
        branch_id: branch.id,
        remarks: row['备注']?.trim() || '',
        avatar_url: '',
      };

      store.members.push(member);
      return toMemberView(member, store);
    });
  });
}

export async function createMember(payload: MemberMutationPayload, currentUser: CurrentUserContext) {
  if (!canCreateMember(currentUser.role)) {
    throw new AppError(403, '当前角色无权新增党员');
  }

  if (!payload.name?.trim()) {
    throw new AppError(400, '请输入党员姓名');
  }

  if (!payload.join_date?.trim()) {
    throw new AppError(400, '请选择入党日期');
  }

  if (!isDatabaseEnabled()) {
    return updateStore((store) => {
      const branch = resolveWritableBranchFromStore(store, currentUser, payload);
      const member = {
        id: getNextNumericId(store.members),
        user_id: undefined,
        name: payload.name?.trim() || '',
        gender: payload.gender?.trim() || '男',
        birthday: payload.birthday?.trim() || '',
        department: payload.department?.trim() || '',
        position: payload.position?.trim() || '',
        political_status: payload.political_status?.trim() || '中共党员',
        join_date: payload.join_date?.trim() || '',
        regular_date: payload.regular_date?.trim() || '',
        last_fee_month: payload.last_fee_month?.trim() || '',
        status: payload.status?.trim() || 'active',
        branch_id: branch.id,
        phone: payload.phone?.trim() || '',
        email: payload.email?.trim() || '',
        remarks: payload.remarks?.trim() || '',
        avatar_url: payload.avatar_url?.trim() || '',
      };

      store.members.push(member);
      return {
        ...toMemberView(member, store),
        account: {
          username: payload.phone?.trim() || `party${member.id}`,
          default_password: env.DEFAULT_LOGIN_PASSWORD,
          role: ROLE_CODES.partyMember,
          role_label: ROLE_LABELS[ROLE_CODES.partyMember],
        },
      };
    });
  }

  await readStore();
  const pool = getDatabasePool();
  if (!pool) {
    throw new AppError(500, '数据库连接不可用');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const branch = await resolveWritableBranchFromDatabase(client, currentUser, payload);

    const roleResult = await client.query<{ id: number }>(
      'SELECT id FROM roles WHERE code = $1 LIMIT 1',
      [ROLE_CODES.partyMember]
    );
    const roleId = Number(roleResult.rows[0]?.id ?? 0);
    if (!roleId) {
      throw new AppError(500, '普通党员角色未初始化');
    }

    const username = await generateUniqueUsername(client, payload.phone);
    const passwordHash = hashSync(env.DEFAULT_LOGIN_PASSWORD, 10);
    const createdUser = await client.query<{ id: number }>(
      `
        INSERT INTO users (
          username, password_hash, name, mobile, role_id, branch_id, status, is_demo, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'active', FALSE, '党员创建时同步生成')
        RETURNING id
      `,
      [
        username,
        passwordHash,
        payload.name?.trim() || '',
        payload.phone?.trim() || '',
        roleId,
        branch.id,
      ]
    );

    const userId = Number(createdUser.rows[0]?.id ?? 0);
    const createdMember = await client.query<{ id: number }>(
      `
        INSERT INTO members (
          user_id, branch_id, name, gender, birthday, department, position,
          political_status, join_date, regular_date, last_fee_month, status,
          phone, email, remarks, avatar_url
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id
      `,
      [
        userId,
        branch.id,
        payload.name?.trim() || '',
        payload.gender?.trim() || '男',
        payload.birthday?.trim() || null,
        payload.department?.trim() || '',
        payload.position?.trim() || '',
        payload.political_status?.trim() || '中共党员',
        payload.join_date?.trim() || '',
        payload.regular_date?.trim() || null,
        payload.last_fee_month?.trim() || '',
        payload.status?.trim() || 'active',
        payload.phone?.trim() || '',
        payload.email?.trim() || '',
        payload.remarks?.trim() || '',
        payload.avatar_url?.trim() || '',
      ]
    );
    const nextMemberId = Number(createdMember.rows[0]?.id ?? 0);

    await client.query('COMMIT');
    logger.info('Created member with synchronized account', {
      operatorId: currentUser.userId,
      memberId: nextMemberId,
      accountUsername: username,
      branchId: branch.id,
    });

    const memberView = await readCreatedMemberView(client, nextMemberId);
    return {
      ...memberView,
      account: {
        username,
        default_password: env.DEFAULT_LOGIN_PASSWORD,
        role: ROLE_CODES.partyMember,
        role_label: ROLE_LABELS[ROLE_CODES.partyMember],
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Create member with synchronized account failed', {
      operatorId: currentUser.userId,
      role: currentUser.role,
      branchId: currentUser.branchId,
      payload: {
        name: payload.name,
        branch_id: payload.branch_id,
        phone: payload.phone,
      },
      error,
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMember(
  id: number,
  payload: MemberMutationPayload,
  currentUser: CurrentUserContext
) {
  if (!canEditMember(currentUser.role)) {
    throw new AppError(403, '当前角色无权编辑党员');
  }

  if (!isDatabaseEnabled()) {
    const updated = await updateStore((store) => {
      const member = store.members.find((item) => item.id === id);
      if (!member) {
        return null;
      }

      if (isPartyMemberRole(currentUser.role)) {
        throw new AppError(403, '普通党员无权编辑党员');
      }

      if (!canManageAllBranches(currentUser) && currentUser.branchId !== member.branch_id) {
        throw new AppError(403, '无权编辑其他支部党员');
      }

      const branch = payload.branch_name || payload.branch_id
        ? resolveWritableBranchFromStore(store, currentUser, payload)
        : undefined;

      Object.assign(member, {
        branch_id: branch?.id ?? member.branch_id,
        name: payload.name?.trim() ?? member.name,
        gender: payload.gender?.trim() ?? member.gender,
        birthday: payload.birthday?.trim() ?? member.birthday,
        department: payload.department?.trim() ?? member.department,
        position: payload.position?.trim() ?? member.position,
        political_status: payload.political_status?.trim() ?? member.political_status,
        join_date: payload.join_date?.trim() ?? member.join_date,
        regular_date: payload.regular_date?.trim() ?? member.regular_date,
        last_fee_month: payload.last_fee_month?.trim() ?? member.last_fee_month,
        status: payload.status?.trim() ?? member.status,
        phone: payload.phone?.trim() ?? member.phone,
        email: payload.email?.trim() ?? member.email,
        remarks: payload.remarks?.trim() ?? member.remarks,
        avatar_url: payload.avatar_url?.trim() ?? member.avatar_url,
      });

      return toMemberView(member, store);
    });

    return requireEntity(updated, '党员不存在');
  }

  await readStore();
  const pool = getDatabasePool();
  if (!pool) {
    throw new AppError(500, '数据库连接不可用');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const memberResult = await client.query<{
      id: number;
      branch_id: number;
      user_id: number | null;
      name: string;
      gender: string;
      birthday: string | null;
      department: string;
      position: string;
      political_status: string;
      join_date: string;
      regular_date: string | null;
      last_fee_month: string;
      status: string;
      phone: string;
      email: string;
      remarks: string;
      avatar_url: string;
    }>(
      `
        SELECT
          id,
          branch_id,
          user_id,
          name,
          gender,
          birthday,
          department,
          position,
          political_status,
          join_date,
          regular_date,
          last_fee_month,
          status,
          phone,
          email,
          remarks,
          avatar_url
        FROM members
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    const existingMember = memberResult.rows[0];

    if (!existingMember) {
      throw new AppError(404, '党员不存在');
    }

    if (!canManageAllBranches(currentUser) && currentUser.branchId !== existingMember.branch_id) {
      throw new AppError(403, '无权编辑其他支部党员');
    }

    const branch =
      payload.branch_id || payload.branch_name
        ? await resolveWritableBranchFromDatabase(client, currentUser, payload)
        : { id: existingMember.branch_id };

    await client.query(
      `
        UPDATE members
        SET branch_id = $2,
            name = $3,
            gender = $4,
            birthday = $5,
            department = $6,
            position = $7,
            political_status = $8,
            join_date = $9,
            regular_date = $10,
            last_fee_month = $11,
            status = $12,
            phone = $13,
            email = $14,
            remarks = $15,
            avatar_url = $16,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        branch.id,
        payload.name?.trim() ?? existingMember.name,
        payload.gender?.trim() ?? existingMember.gender,
        payload.birthday !== undefined
          ? payload.birthday.trim() || null
          : existingMember.birthday,
        payload.department?.trim() ?? existingMember.department,
        payload.position?.trim() ?? existingMember.position,
        payload.political_status?.trim() ?? existingMember.political_status,
        payload.join_date?.trim() || existingMember.join_date,
        payload.regular_date !== undefined
          ? payload.regular_date.trim() || null
          : existingMember.regular_date,
        payload.last_fee_month?.trim() ?? existingMember.last_fee_month,
        payload.status?.trim() ?? existingMember.status,
        payload.phone?.trim() ?? existingMember.phone,
        payload.email?.trim() ?? existingMember.email,
        payload.remarks?.trim() ?? existingMember.remarks,
        payload.avatar_url?.trim() ?? existingMember.avatar_url,
      ]
    );

    if (existingMember.user_id) {
      await client.query(
        `
          UPDATE users
          SET name = $2,
              mobile = $3,
              branch_id = $4,
              updated_at = NOW()
          WHERE id = $1
        `,
        [
          existingMember.user_id,
          payload.name?.trim() ?? existingMember.name,
          payload.phone?.trim() ?? existingMember.phone,
          branch.id,
        ]
      );
    }

    await client.query('COMMIT');
    return await readCreatedMemberView(client, id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMember(id: number, currentUser: CurrentUserContext) {
  if (!canEditMember(currentUser.role)) {
    throw new AppError(403, '当前角色无权删除党员');
  }

  if (!isDatabaseEnabled()) {
    const deleted = await updateStore((store) => {
      const index = store.members.findIndex((member) => member.id === id);
      if (index < 0) {
        return false;
      }

      if (
        !canManageAllBranches(currentUser) &&
        currentUser.branchId !== store.members[index]?.branch_id
      ) {
        throw new AppError(403, '无权删除其他支部党员');
      }

      store.members.splice(index, 1);
      return true;
    });

    if (!deleted) {
      throw new AppError(404, '党员不存在');
    }

    return;
  }

  await readStore();
  const pool = getDatabasePool();
  if (!pool) {
    throw new AppError(500, '数据库连接不可用');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const memberResult = await client.query<{ branch_id: number; user_id: number | null }>(
      'SELECT branch_id, user_id FROM members WHERE id = $1 LIMIT 1',
      [id]
    );
    const existingMember = memberResult.rows[0];

    if (!existingMember) {
      throw new AppError(404, '党员不存在');
    }

    if (!canManageAllBranches(currentUser) && currentUser.branchId !== existingMember.branch_id) {
      throw new AppError(403, '无权删除其他支部党员');
    }

    await client.query('DELETE FROM members WHERE id = $1', [id]);
    if (existingMember.user_id) {
      await client.query('DELETE FROM users WHERE id = $1', [existingMember.user_id]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
