import type { StoreData } from './types';
import {
  ROLE_CODES,
  ROLE_LABELS,
  normalizeRoleCode,
  type RoleCode,
} from '../utils/rbac';

export interface AuthUserRecord {
  id: number;
  username: string;
  name: string;
  role: RoleCode;
  role_label: string;
  branch_id?: number;
  branch_name?: string;
  member_id?: number;
  mobile?: string;
  status?: string;
  is_demo?: boolean;
}

export interface DemoAccountRecord {
  username: string;
  password: string;
  description: string;
  user: AuthUserRecord;
}

export interface DemoAccountSeed {
  username: string;
  name: string;
  role: RoleCode;
  description: string;
  useFirstBranch?: boolean;
  bindFirstBranchMember?: boolean;
}

export const DEMO_ACCOUNT_SEEDS: DemoAccountSeed[] = [
  {
    username: 'leader01',
    name: '党委领导',
    role: ROLE_CODES.committeeLeader,
    description: '查看全局看板、党支部和党员总体情况，只读访问。',
  },
  {
    username: 'admin01',
    name: '党建纪检部',
    role: ROLE_CODES.partyAdmin,
    description: '可创建党支部、维护党员，并在新增党员时同步生成账号。',
  },
  {
    username: 'secretary01',
    name: '第一支部书记',
    role: ROLE_CODES.branchSecretary,
    description: '仅查看和维护本支部党员，可新增本支部党员。',
    useFirstBranch: true,
  },
  {
    username: 'member01',
    name: '普通党员',
    role: ROLE_CODES.partyMember,
    description: '只查看本人的党员档案，无创建和编辑权限。',
    useFirstBranch: true,
    bindFirstBranchMember: true,
  },
];

const FALLBACK_USER_NAME_BY_ID: Record<number, string> = {
  1: '党委领导',
  2: '党建纪检部',
  3: '第一支部书记',
  4: '普通党员',
};

export function getUserDisplayName(userId?: number) {
  if (!userId) {
    return '系统用户';
  }

  return FALLBACK_USER_NAME_BY_ID[userId] ?? `用户${userId}`;
}

export function toUserView(
  user: Partial<AuthUserRecord> & Pick<AuthUserRecord, 'id' | 'name' | 'username'>,
  store?: StoreData
): AuthUserRecord {
  const role = normalizeRoleCode(user.role);

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role,
    role_label: ROLE_LABELS[role],
    branch_id: user.branch_id,
    branch_name:
      user.branch_name ??
      (user.branch_id
        ? store?.branches.find((branch) => branch.id === user.branch_id)?.name
        : undefined),
    member_id: user.member_id,
    mobile: user.mobile,
    status: user.status,
    is_demo: user.is_demo,
  };
}
