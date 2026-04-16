import type { AuthSessionUser } from './api';

export const ROLE_CODES = {
  committeeLeader: 'committee_leader',
  partyAdmin: 'party_admin',
  branchSecretary: 'branch_secretary',
  partyMember: 'party_member',
} as const;

export function isCommitteeLeader(user?: AuthSessionUser | null) {
  return user?.role === ROLE_CODES.committeeLeader;
}

export function isPartyAdmin(user?: AuthSessionUser | null) {
  return user?.role === ROLE_CODES.partyAdmin;
}

export function isBranchSecretary(user?: AuthSessionUser | null) {
  return user?.role === ROLE_CODES.branchSecretary;
}

export function isPartyMember(user?: AuthSessionUser | null) {
  return user?.role === ROLE_CODES.partyMember;
}

export function canCreateBranch(user?: AuthSessionUser | null) {
  return isPartyAdmin(user);
}

export function canCreateMember(user?: AuthSessionUser | null) {
  return isPartyAdmin(user) || isBranchSecretary(user);
}

export function canEditBranch(user?: AuthSessionUser | null) {
  return isPartyAdmin(user);
}

export function canEditMember(user?: AuthSessionUser | null) {
  return isPartyAdmin(user) || isBranchSecretary(user);
}

export function canViewBranchModule(user?: AuthSessionUser | null) {
  return !isPartyMember(user);
}

export function getDashboardSubtitle(user?: AuthSessionUser | null) {
  if (isPartyAdmin(user)) {
    return '党建纪检部工作台';
  }

  if (isBranchSecretary(user)) {
    return '本支部党员维护工作台';
  }

  if (isCommitteeLeader(user)) {
    return '党委领导总览工作台';
  }

  return '个人党建档案中心';
}
