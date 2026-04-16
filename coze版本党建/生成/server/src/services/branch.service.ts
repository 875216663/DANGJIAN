import {
  findBranchById,
  findBranchByName,
  getNextNumericId,
  readStore,
  toBranchView,
  toMemberView,
  updateStore,
} from '../models/store.model';
import { getDatabasePool, isDatabaseEnabled } from '../config/database';
import { AppError } from '../utils/app-error';
import type { CurrentUserContext } from '../middlewares/auth.middleware';
import { resolveBranchScope } from '../middlewares/auth.middleware';
import { assertBranchAccess, requireEntity } from './store-helper.service';
import {
  canCreateBranch,
  canEditBranch,
} from '../utils/rbac';

interface BranchListQuery {
  branch_id?: number;
}

interface BranchMutationPayload {
  name?: string;
  code?: string;
  description?: string;
  contact_phone?: string;
  establish_date?: string;
  renewal_reminder_date?: string;
  secretary_id?: number;
  secretary_name?: string;
  status?: string;
  remark?: string;
}

interface ActivistMutationPayload {
  name?: string;
  gender?: string;
  nation?: string;
  birthday?: string;
  education?: string;
  application_date?: string;
  talk_date?: string;
}

export async function listBranches(query: BranchListQuery, currentUser: CurrentUserContext) {
  const store = await readStore();
  const scopedBranchId = resolveBranchScope(currentUser, query.branch_id);
  let branches = store.branches;

  if (scopedBranchId) {
    branches = branches.filter((branch) => branch.id === scopedBranchId);
  }

  return branches.map((branch) => toBranchView(branch, store));
}

export async function getBranchById(id: number, currentUser: CurrentUserContext) {
  assertBranchAccess(currentUser, id);
  const store = await readStore();
  const branch = requireEntity(findBranchById(store, id), '支部不存在');
  return toBranchView(branch, store);
}

export async function getBranchMembers(id: number, currentUser: CurrentUserContext) {
  assertBranchAccess(currentUser, id);
  const store = await readStore();
  requireEntity(findBranchById(store, id), '支部不存在');

  return store.members
    .filter((member) => member.branch_id === id)
    .map((member) => toMemberView(member, store));
}

export async function listBranchActivists(id: number, currentUser: CurrentUserContext) {
  assertBranchAccess(currentUser, id);
  const store = await readStore();
  requireEntity(findBranchById(store, id), '支部不存在');
  return store.activists.filter((activist) => activist.branch_id === id);
}

export async function createBranch(payload: BranchMutationPayload, currentUser: CurrentUserContext) {
  if (!canCreateBranch(currentUser.role)) {
    throw new AppError(403, '仅党建纪检部可以创建支部');
  }

  if (isDatabaseEnabled()) {
    await readStore();
    const pool = getDatabasePool();
    if (!pool) {
      throw new AppError(500, '数据库连接不可用');
    }

    const nextName = payload.name?.trim() || '';
    const nextCode = payload.code?.trim() || '';
    const duplicated = await pool.query<{ id: number }>(
      'SELECT id FROM branches WHERE name = $1 OR code = $2 LIMIT 1',
      [nextName, nextCode]
    );

    if (duplicated.rows.length > 0) {
      throw new AppError(409, '支部名称或支部代码已存在');
    }

    const nextIdResult = await pool.query<{ id: string }>(
      'SELECT COALESCE(MAX(id), 0)::text AS id FROM branches'
    );
    const nextId = Number(nextIdResult.rows[0]?.id ?? '0') + 1;
    const created = await pool.query<{
      id: number;
      name: string;
      code: string;
      description: string;
      contact_phone: string;
      establish_date: string;
      renewal_reminder_date: string;
      secretary_id: number | null;
      secretary_name: string;
      status: string;
      remark: string;
      committee_members: unknown[];
    }>(
      `
        INSERT INTO branches (
          id, name, code, description, contact_phone, establish_date, renewal_reminder_date,
          secretary_id, secretary_name, status, remark, committee_members
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
        RETURNING *
      `,
      [
        nextId,
        nextName,
        nextCode,
        payload.description?.trim() || '',
        payload.contact_phone?.trim() || '',
        payload.establish_date?.trim() || new Date().toISOString().slice(0, 10),
        payload.renewal_reminder_date?.trim() ||
          payload.establish_date?.trim() ||
          new Date().toISOString().slice(0, 10),
        payload.secretary_id ?? null,
        payload.secretary_name?.trim() || '',
        payload.status?.trim() || 'active',
        payload.remark?.trim() || '',
        JSON.stringify(
          payload.secretary_name?.trim()
            ? [{ position: '书记', name: payload.secretary_name.trim() }]
            : []
        ),
      ]
    );

    const row = created.rows[0];
    return {
      id: Number(row.id),
      name: row.name,
      code: row.code,
      description: row.description,
      contact_phone: row.contact_phone || '',
      establish_date: row.establish_date ? String(row.establish_date).slice(0, 10) : '',
      renewal_reminder_date: row.renewal_reminder_date
        ? String(row.renewal_reminder_date).slice(0, 10)
        : '',
      secretary_id: row.secretary_id ? Number(row.secretary_id) : undefined,
      secretary_name: row.secretary_name || '',
      status: row.status,
      remark: row.remark || '',
      committee_members: Array.isArray(row.committee_members) ? row.committee_members : [],
      member_count: 0,
      probationary_count: 0,
      activist_count: 0,
      applicant_count: 0,
    };
  }

  return updateStore((store) => {
    const nextName = payload.name?.trim() || '';
    const nextCode = payload.code?.trim() || '';

    if (findBranchByName(store, nextName)) {
      throw new AppError(409, '支部名称已存在');
    }

    if (store.branches.some((item) => item.code === nextCode)) {
      throw new AppError(409, '支部代码已存在');
    }

    const branch = {
      id: getNextNumericId(store.branches),
      name: nextName,
      code: nextCode,
      description: payload.description?.trim() || '',
      contact_phone: payload.contact_phone?.trim() || '',
      establish_date: payload.establish_date?.trim() || new Date().toISOString().slice(0, 10),
      renewal_reminder_date:
        payload.renewal_reminder_date?.trim() ||
        payload.establish_date?.trim() ||
        new Date().toISOString().slice(0, 10),
      secretary_id: payload.secretary_id,
      secretary_name: payload.secretary_name?.trim() || '',
      status: payload.status?.trim() || 'active',
      remark: payload.remark?.trim() || '',
      committee_members: payload.secretary_name?.trim()
        ? [{ position: '书记', name: payload.secretary_name.trim() }]
        : [],
    };

    store.branches.push(branch);
    return toBranchView(branch, store);
  });
}

export async function updateBranch(
  id: number,
  payload: BranchMutationPayload,
  currentUser: CurrentUserContext
) {
  if (!canEditBranch(currentUser.role)) {
    throw new AppError(403, '仅党建纪检部可以编辑支部');
  }

  const updated = await updateStore((store) => {
    const branch = store.branches.find((item) => item.id === id);
    if (!branch) {
      return null;
    }

    assertBranchAccess(currentUser, id);

    const nextName = payload.name?.trim() || branch.name;
    const nextCode = payload.code?.trim() || branch.code;

    if (store.branches.some((item) => item.id !== id && item.name === nextName)) {
      throw new AppError(409, '支部名称已存在');
    }

    if (store.branches.some((item) => item.id !== id && item.code === nextCode)) {
      throw new AppError(409, '支部代码已存在');
    }

    branch.name = nextName;
    branch.code = nextCode;
    branch.description = payload.description?.trim() || '';
    branch.contact_phone = payload.contact_phone?.trim() || branch.contact_phone || '';
    branch.establish_date = payload.establish_date?.trim() || branch.establish_date;
    branch.renewal_reminder_date =
      payload.renewal_reminder_date?.trim() ||
      payload.establish_date?.trim() ||
      branch.renewal_reminder_date;
    branch.secretary_id = payload.secretary_id ?? branch.secretary_id;
    branch.secretary_name = payload.secretary_name?.trim() || branch.secretary_name;
    branch.status = payload.status?.trim() || branch.status;
    branch.remark = payload.remark?.trim() || branch.remark || '';

    if (branch.secretary_name) {
      const committeeMembers = branch.committee_members.filter(
        (member) => member.position !== '书记'
      );
      branch.committee_members = [
        { position: '书记', name: branch.secretary_name },
        ...committeeMembers,
      ];
    }

    return toBranchView(branch, store);
  });

  return requireEntity(updated, '支部不存在');
}

export async function deleteBranch(id: number, currentUser: CurrentUserContext) {
  if (!canEditBranch(currentUser.role)) {
    throw new AppError(403, '仅党建纪检部可以删除支部');
  }

  const deleted = await updateStore((store) => {
    const hasMembers = store.members.some((member) => member.branch_id === id);
    const hasActivists = store.activists.some((activist) => activist.branch_id === id);
    const hasMeetings = store.meetings.some((meeting) => meeting.branch_id === id);

    if (hasMembers || hasActivists || hasMeetings) {
      return 'HAS_RELATION';
    }

    const index = store.branches.findIndex((branch) => branch.id === id);
    if (index < 0) {
      return 'NOT_FOUND';
    }

    store.branches.splice(index, 1);
    return 'DELETED';
  });

  if (deleted === 'NOT_FOUND') {
    throw new AppError(404, '支部不存在');
  }

  if (deleted === 'HAS_RELATION') {
    throw new AppError(400, '该支部下仍有关联党员、积极分子或会议，无法删除');
  }
}

async function createOrUpdateActivist(
  mode: 'create' | 'update',
  branchId: number,
  activistId: number | undefined,
  payload: ActivistMutationPayload,
  currentUser?: CurrentUserContext
) {
  if (currentUser) {
    assertBranchAccess(currentUser, branchId);
  }

  if (mode === 'create') {
    return updateStore((store) => {
      requireEntity(findBranchById(store, branchId), '支部不存在');

      const activist = {
        id: getNextNumericId(store.activists),
        branch_id: branchId,
        name: payload.name?.trim() || '',
        gender: payload.gender?.trim() || '男',
        nation: payload.nation?.trim() || '汉族',
        birthday: payload.birthday?.trim() || '',
        education: payload.education?.trim() || '',
        application_date: payload.application_date?.trim() || '',
        talk_date: payload.talk_date?.trim() || '',
      };

      store.activists.push(activist);
      return activist;
    });
  }

  const updated = await updateStore((store) => {
    const activist = store.activists.find(
      (item) => item.id === activistId && item.branch_id === branchId
    );

    if (!activist) {
      return null;
    }

    Object.assign(activist, {
      name: payload.name?.trim() || activist.name,
      gender: payload.gender?.trim() || activist.gender,
      nation: payload.nation?.trim() || activist.nation,
      birthday: payload.birthday?.trim() || activist.birthday,
      education: payload.education?.trim() || activist.education,
      application_date: payload.application_date?.trim() || activist.application_date,
      talk_date: payload.talk_date?.trim() || activist.talk_date,
    });

    return activist;
  });

  return requireEntity(updated, '积极分子不存在');
}

export async function createActivist(
  branchId: number,
  payload: ActivistMutationPayload,
  currentUser: CurrentUserContext
) {
  return createOrUpdateActivist('create', branchId, undefined, payload, currentUser);
}

export async function updateActivist(
  branchId: number,
  activistId: number,
  payload: ActivistMutationPayload,
  currentUser: CurrentUserContext
) {
  return createOrUpdateActivist('update', branchId, activistId, payload, currentUser);
}

export async function deleteActivist(
  branchId: number,
  activistId: number,
  currentUser: CurrentUserContext
) {
  assertBranchAccess(currentUser, branchId);

  const removed = await updateStore((store) => {
    const index = store.activists.findIndex(
      (item) => item.id === activistId && item.branch_id === branchId
    );

    if (index < 0) {
      return false;
    }

    store.activists.splice(index, 1);
    return true;
  });

  if (!removed) {
    throw new AppError(404, '积极分子不存在');
  }
}
