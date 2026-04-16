import {
  findBranchByName,
  findBranchById,
  getNextNumericId,
  readStore,
  toMemberView,
  updateStore,
} from '../models/store.model';
import type { CurrentUserContext } from '../middlewares/auth.middleware';
import { resolveBranchScope } from '../middlewares/auth.middleware';
import { AppError } from '../utils/app-error';
import { buildPaginationMeta, ensureBranchByName, requireEntity } from './store-helper.service';

interface MemberListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  branch_id?: number;
}

function canManageAllBranches(currentUser: CurrentUserContext) {
  return currentUser.role === 'party_committee' || currentUser.role === 'party_inspection';
}

function resolveWritableBranch(
  store: Awaited<ReturnType<typeof readStore>>,
  currentUser: CurrentUserContext,
  branchName?: string,
  options?: { allowAutoCreate?: boolean }
) {
  const normalizedBranchName = branchName?.trim();

  if (canManageAllBranches(currentUser)) {
    if (!normalizedBranchName) {
      return ensureBranchByName(store, undefined);
    }

    const existingBranch = findBranchByName(store, normalizedBranchName);
    if (existingBranch) {
      return existingBranch;
    }

    if (options?.allowAutoCreate) {
      return ensureBranchByName(store, normalizedBranchName);
    }

    throw new AppError(400, '所属支部不存在，请先创建支部');
  }

  if (!currentUser.branchId) {
    throw new AppError(403, '当前账号未绑定可管理支部');
  }

  const ownBranch = requireEntity(
    findBranchById(store, currentUser.branchId),
    '当前账号绑定的支部不存在'
  );

  if (normalizedBranchName && normalizedBranchName !== ownBranch.name) {
    throw new AppError(403, '无权维护其他支部党员');
  }

  return ownBranch;
}

export async function listMembers(query: MemberListQuery, currentUser: CurrentUserContext) {
  const store = await readStore();
  const scopedBranchId = resolveBranchScope(currentUser, query.branch_id);

  let members = store.members.map((member) => toMemberView(member, store));

  if (scopedBranchId) {
    members = members.filter((member) => member.branch_id === scopedBranchId);
  }

  if (query.status) {
    members = members.filter((member) => member.status === query.status);
  }

  if (query.search) {
    const keyword = query.search.toLowerCase();
    members = members.filter((member) =>
      [member.name, member.department, member.position, member.branch_name]
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

  const scopedBranchId = resolveBranchScope(currentUser, undefined);
  if (
    scopedBranchId &&
    currentUser.role !== 'party_committee' &&
    currentUser.role !== 'party_inspection' &&
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
  const scopedBranchId = resolveBranchScope(currentUser, query.branch_id);
  let members = store.members.map((member) => toMemberView(member, store));

  if (scopedBranchId) {
    members = members.filter((member) => member.branch_id === scopedBranchId);
  }

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

      const branch = resolveWritableBranch(store, currentUser, row['所属支部']?.trim(), {
        allowAutoCreate: canManageAllBranches(currentUser),
      });

      const member = {
        id: getNextNumericId(store.members),
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
  branch_name?: string;
  phone?: string;
  email?: string;
  remarks?: string;
  avatar_url?: string;
}

export async function createMember(payload: MemberMutationPayload, currentUser: CurrentUserContext) {
  return updateStore((store) => {
    const branch = resolveWritableBranch(store, currentUser, payload.branch_name);

    const member = {
      id: getNextNumericId(store.members),
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
    return toMemberView(member, store);
  });
}

export async function updateMember(
  id: number,
  payload: MemberMutationPayload,
  currentUser: CurrentUserContext
) {
  const updated = await updateStore((store) => {
    const member = store.members.find((item) => item.id === id);
    if (!member) {
      return null;
    }

    if (!canManageAllBranches(currentUser) && currentUser.branchId !== member.branch_id) {
      throw new AppError(403, '无权编辑其他支部党员');
    }

    const branch = payload.branch_name
      ? resolveWritableBranch(store, currentUser, payload.branch_name)
      : undefined;

    Object.assign(member, {
      ...payload,
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

export async function deleteMember(id: number, currentUser: CurrentUserContext) {
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

    store.branches.forEach((branch) => {
      if (branch.secretary_id === id) {
        branch.secretary_id = undefined;
        branch.secretary_name = '';
        branch.committee_members = branch.committee_members.filter(
          (item) => item.position !== '书记'
        );
      }
    });

    return true;
  });

  if (!deleted) {
    throw new AppError(404, '党员不存在');
  }
}
