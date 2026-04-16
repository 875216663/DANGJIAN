export const ROLE_CODES = {
  committeeLeader: 'committee_leader',
  partyAdmin: 'party_admin',
  branchSecretary: 'branch_secretary',
  partyMember: 'party_member',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const ROLE_LABELS: Record<RoleCode, string> = {
  [ROLE_CODES.committeeLeader]: '党委领导',
  [ROLE_CODES.partyAdmin]: '党建纪检部',
  [ROLE_CODES.branchSecretary]: '党支部书记/委员',
  [ROLE_CODES.partyMember]: '普通党员',
};

export const LEGACY_ROLE_ALIASES: Record<string, RoleCode> = {
  party_committee: ROLE_CODES.committeeLeader,
  party_inspection: ROLE_CODES.partyAdmin,
  branch_secretary: ROLE_CODES.branchSecretary,
  branch_member: ROLE_CODES.partyMember,
  member: ROLE_CODES.partyMember,
  committee_leader: ROLE_CODES.committeeLeader,
  party_admin: ROLE_CODES.partyAdmin,
  party_member: ROLE_CODES.partyMember,
};

export function normalizeRoleCode(input?: string): RoleCode {
  if (!input) {
    return ROLE_CODES.partyMember;
  }

  return LEGACY_ROLE_ALIASES[input] ?? ROLE_CODES.partyMember;
}

export function isCommitteeLeader(role?: string) {
  return normalizeRoleCode(role) === ROLE_CODES.committeeLeader;
}

export function isPartyAdmin(role?: string) {
  return normalizeRoleCode(role) === ROLE_CODES.partyAdmin;
}

export function isBranchSecretary(role?: string) {
  return normalizeRoleCode(role) === ROLE_CODES.branchSecretary;
}

export function isPartyMemberRole(role?: string) {
  return normalizeRoleCode(role) === ROLE_CODES.partyMember;
}

export function canCreateBranch(role?: string) {
  return isPartyAdmin(role);
}

export function canEditBranch(role?: string) {
  return isPartyAdmin(role);
}

export function canCreateMember(role?: string) {
  const normalized = normalizeRoleCode(role);
  return (
    normalized === ROLE_CODES.partyAdmin || normalized === ROLE_CODES.branchSecretary
  );
}

export function canEditMember(role?: string) {
  return canCreateMember(role);
}

export function canViewAllData(role?: string) {
  const normalized = normalizeRoleCode(role);
  return (
    normalized === ROLE_CODES.committeeLeader || normalized === ROLE_CODES.partyAdmin
  );
}
