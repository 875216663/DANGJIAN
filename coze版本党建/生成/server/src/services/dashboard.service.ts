import { readStore } from '../models/store.model';
import { calculateMonthDistance, getCurrentMonth, getLastMonth } from '../utils/date';
import type { CurrentUserContext } from '../middlewares/auth.middleware';
import { resolveBranchScope } from '../middlewares/auth.middleware';

export async function getDashboardSummary(currentUser: CurrentUserContext) {
  const store = await readStore();
  const scopedBranchId = resolveBranchScope(currentUser, undefined);

  const members = scopedBranchId
    ? store.members.filter((member) => member.branch_id === scopedBranchId)
    : store.members;
  const branches = scopedBranchId
    ? store.branches.filter((branch) => branch.id === scopedBranchId)
    : store.branches;
  const meetings = scopedBranchId
    ? store.meetings.filter((meeting) => meeting.branch_id === scopedBranchId)
    : store.meetings;
  const currentMonth = getCurrentMonth();
  const lastMonth = getLastMonth();

  const feeCompleted = members.filter((member) =>
    [currentMonth, lastMonth].includes(member.last_fee_month)
  ).length;

  const completedMeetings = meetings.filter((meeting) => meeting.status === 'completed').length;
  const probationaryWarnings = members.filter((member) => {
    if (member.status !== 'probationary' || !member.regular_date) {
      return false;
    }

    const regularDate = new Date(member.regular_date);
    const now = new Date();
    const diffDays = Math.floor(
      (regularDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return diffDays <= 90;
  }).length;

  return {
    memberCount: members.length,
    branchCount: branches.length,
    activeCount: members.filter((member) => member.status === 'active').length,
    probationaryCount: members.filter((member) => member.status === 'probationary').length,
    branchWithSecretaryCount: branches.filter(
      (branch) => Boolean(branch.secretary_name || branch.secretary_id)
    ).length,
    feeCompletionRate: Number(((feeCompleted / Math.max(1, members.length)) * 100).toFixed(1)),
    meetingCompletionRate: Number(
      ((completedMeetings / Math.max(1, meetings.length || 1)) * 100).toFixed(1)
    ),
    probationaryWarningCount: probationaryWarnings,
    studyCompletionRate: Number(
      Math.min(100, Math.round((store.studyFiles.length / Math.max(1, members.length)) * 100 * 2))
    ),
  };
}

export async function getDashboardAlerts(currentUser: CurrentUserContext) {
  const store = await readStore();
  const scopedBranchId = resolveBranchScope(currentUser, undefined);

  const members = scopedBranchId
    ? store.members.filter((member) => member.branch_id === scopedBranchId)
    : store.members;
  const branches = scopedBranchId
    ? store.branches.filter((branch) => branch.id === scopedBranchId)
    : store.branches;

  return [
    ...members
      .filter((member) => member.status === 'probationary' && member.regular_date)
      .map((member) => ({
        id: `probation-${member.id}`,
        alert_type: '转正预警',
        alert_level: 'warning',
        target_id: member.id,
        target_type: 'member',
        description: `${member.name} 将于 ${member.regular_date} 转正，请及时办理相关手续`,
        alert_date: new Date().toISOString().slice(0, 10),
        is_handled: false,
      })),
    ...members
      .filter((member) => calculateMonthDistance(member.last_fee_month) >= 2)
      .map((member) => ({
        id: `fee-${member.id}`,
        alert_type: '党费欠缴',
        alert_level: 'critical',
        target_id: member.id,
        target_type: 'member',
        description: `${member.name} 最近一次党费记录为 ${member.last_fee_month || '未记录'}，请及时核查`,
        alert_date: new Date().toISOString().slice(0, 10),
        is_handled: false,
      })),
    ...branches
      .filter((branch) => {
        const renewalDate = new Date(branch.renewal_reminder_date);
        const now = new Date();
        const diffDays = Math.floor(
          (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays <= 180;
      })
      .map((branch) => ({
        id: `renewal-${branch.id}`,
        alert_type: '换届提醒',
        alert_level: 'warning',
        target_id: branch.id,
        target_type: 'branch',
        description: `${branch.name} 将于 ${branch.renewal_reminder_date} 到达换届提醒节点`,
        alert_date: new Date().toISOString().slice(0, 10),
        is_handled: false,
      })),
  ]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .slice(0, 8);
}

export async function getDashboardTodos(currentUser: CurrentUserContext) {
  const store = await readStore();
  const scopedBranchId = resolveBranchScope(currentUser, undefined);

  const members = scopedBranchId
    ? store.members.filter((member) => member.branch_id === scopedBranchId)
    : store.members;
  const meetings = scopedBranchId
    ? store.meetings.filter((meeting) => meeting.branch_id === scopedBranchId)
    : store.meetings;

  return [
    ...members
      .filter((member) => member.status === 'probationary')
      .map((member) => ({
        type: 'approval',
        title: `${member.name} 转正申请`,
        description: '待审批',
        route: '/member-detail',
        params: { id: member.id },
      })),
    ...meetings
      .filter((meeting) => meeting.status === 'planned' || meeting.status === 'ongoing')
      .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime())
      .map((meeting) => ({
        type: 'meeting',
        title: meeting.title,
        description:
          meeting.status === 'planned' ? '计划中 - 需要组织召开' : '进行中 - 请及时补录纪要',
        route: '/meeting-form',
        params: { id: meeting.id },
        meeting_type: meeting.meeting_type,
      })),
    ...(store.studyFiles.length === 0
      ? [
          {
            type: 'study',
            title: '学习中心资料待上传',
            description: '建议补充本月学习教育资料',
            route: '/study',
          },
        ]
      : []),
  ].slice(0, 10);
}
