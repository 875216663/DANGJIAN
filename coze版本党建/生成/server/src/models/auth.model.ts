import type { StoreData } from './types';

export interface AuthUserRecord {
  id: number;
  name: string;
  role: string;
  branch_id?: number;
}

export interface DemoAccountRecord {
  user_id: number;
  username: string;
  password: string;
  description: string;
}

export const ROLE_LABELS: Record<string, string> = {
  party_committee: '党委管理员',
  party_inspection: '巡检管理员',
  branch_secretary: '支部管理员',
  branch_member: '支部只读账号',
  member: '普通党员账号',
};

export const USER_DIRECTORY: Record<number, AuthUserRecord> = {
  1: { id: 1, name: '张书记', role: 'party_committee' },
  2: { id: 2, name: '李委员', role: 'branch_secretary', branch_id: 1 },
  3: { id: 3, name: '王纪检', role: 'branch_secretary', branch_id: 2 },
  4: { id: 4, name: '赵同志', role: 'branch_member', branch_id: 1 },
  5: { id: 5, name: '巡检管理员', role: 'party_inspection' },
};

export const DEMO_ACCOUNT_DIRECTORY: DemoAccountRecord[] = [
  {
    user_id: 1,
    username: 'leader01',
    password: '123456',
    description: '党委管理员账号，可查看和维护全部支部与党员信息。',
  },
  {
    user_id: 2,
    username: 'office01',
    password: '123456',
    description: '第一支部管理员账号，仅维护综合管理党支部的数据。',
  },
  {
    user_id: 3,
    username: 'branch01',
    password: '123456',
    description: '第二支部管理员账号，仅维护研发运营党支部的数据。',
  },
  {
    user_id: 4,
    username: 'member01',
    password: '123456',
    description: '支部只读账号，可查看本支部信息，但不可新增、编辑或删除。',
  },
  {
    user_id: 5,
    username: 'admin01',
    password: '123456',
    description: '巡检管理员账号，可跨支部查看与巡检数据。',
  },
];

export function getUserDisplayName(userId?: number) {
  if (!userId) {
    return '系统用户';
  }

  return USER_DIRECTORY[userId]?.name ?? `用户${userId}`;
}

export function toUserView(user: AuthUserRecord, store: StoreData) {
  const account = DEMO_ACCOUNT_DIRECTORY.find((item) => item.user_id === user.id);
  return {
    ...user,
    username: account?.username,
    role_label: ROLE_LABELS[user.role] || user.role,
    branch_name: user.branch_id
      ? store.branches.find((branch) => branch.id === user.branch_id)?.name
      : undefined,
  };
}
