import { AppError } from '../utils/app-error';
import type { CurrentUserContext } from '../middlewares/auth.middleware';
import {
  findBranchById,
  findBranchByName,
  getNextNumericId,
} from '../models/store.model';
import type { StoreData } from '../models/types';

export function ensureBranchByName(store: StoreData, branchName?: string) {
  const normalizedBranchName = branchName?.trim() || '综合管理党支部';
  let branch = findBranchByName(store, normalizedBranchName);

  if (!branch) {
    const createdBranchId = getNextNumericId(store.branches);
    branch = {
      id: createdBranchId,
      name: normalizedBranchName,
      code: `B${String(createdBranchId).padStart(3, '0')}`,
      description: `${normalizedBranchName}（自动创建）`,
      establish_date: new Date().toISOString().slice(0, 10),
      renewal_reminder_date: new Date().toISOString().slice(0, 10),
      secretary_name: '',
      status: 'active',
      committee_members: [],
    };

    store.branches.push(branch);
  }

  return branch;
}

export function assertBranchAccess(currentUser: CurrentUserContext, branchId?: number) {
  if (!branchId) {
    return;
  }

  if (currentUser.role === 'party_committee' || currentUser.role === 'party_inspection') {
    return;
  }

  if (currentUser.branchId !== branchId) {
    throw new AppError(403, '无权访问其他支部数据');
  }
}

export function requireEntity<T>(entity: T | undefined | null, message: string): T {
  if (!entity) {
    throw new AppError(404, message);
  }

  return entity;
}

export function buildPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
  };
}
