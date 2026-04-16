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
  party_committee: '系统管理员',
  party_inspection: '系统管理员',
  branch_secretary: '系统管理员',
  branch_member: '系统管理员',
  member: '系统管理员',
};

export const USER_DIRECTORY: Record<number, AuthUserRecord> = {
  1: { id: 1, name: '张书记', role: 'party_committee', branch_id: 1 },
  2: { id: 2, name: '李委员', role: 'party_committee', branch_id: 1 },
  3: { id: 3, name: '王纪检', role: 'party_committee', branch_id: 2 },
  4: { id: 4, name: '党委管理员', role: 'party_committee' },
};

export const DEMO_ACCOUNT_DIRECTORY: DemoAccountRecord[] = [
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
