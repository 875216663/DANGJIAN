import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import {
  getCurrentMonth,
  getLastMonth,
  readStore,
} from '../data/store';

const router = Router();

function calculateMonthDistance(monthValue: string) {
  if (!monthValue) {
    return Number.POSITIVE_INFINITY;
  }

  const [year, month] = monthValue.split('-').map(Number);
  const now = new Date();

  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

router.get('/dashboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const store = await readStore();
    const currentMonth = getCurrentMonth();
    const lastMonth = getLastMonth();
    const feeCompleted = store.members.filter((member) =>
      [currentMonth, lastMonth].includes(member.last_fee_month)
    ).length;
    const completedMeetings = store.meetings.filter((meeting) => meeting.status === 'completed').length;
    const probationaryWarnings = store.members.filter((member) => {
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

    const studyCompletionRate = Math.min(
      100,
      Math.round((store.studyFiles.length / Math.max(1, store.members.length)) * 100 * 2)
    );

    res.json({
      memberCount: store.members.length,
      branchCount: store.branches.length,
      feeCompletionRate: Number(
        ((feeCompleted / Math.max(1, store.members.length)) * 100).toFixed(1)
      ),
      meetingCompletionRate: Number(
        ((completedMeetings / Math.max(1, store.meetings.length)) * 100).toFixed(1)
      ),
      probationaryWarningCount: probationaryWarnings,
      studyCompletionRate,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: '获取看板数据失败' });
  }
});

router.get('/alerts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const store = await readStore();
    const alerts = [
      ...store.members
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
      ...store.members
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
      ...store.branches
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

    res.json(alerts);
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: '获取预警列表失败' });
  }
});

router.get('/todos', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const store = await readStore();
    const todos = [
      ...store.members
        .filter((member) => member.status === 'probationary')
        .map((member) => ({
          type: 'approval',
          title: `${member.name} 转正申请`,
          description: '待审批',
          route: '/member-detail',
          params: { id: member.id },
        })),
      ...store.meetings
        .filter((meeting) => meeting.status === 'planned' || meeting.status === 'ongoing')
        .sort(
          (a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime()
        )
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
              params: undefined,
            },
          ]
        : []),
      ...store.members
        .filter((member) => calculateMonthDistance(member.last_fee_month) >= 2)
        .slice(0, 2)
        .map((member) => ({
          type: 'fee',
          title: `${member.name} 党费补缴情形`,
          description: `最近记录：${member.last_fee_month || '未登记'}`,
          route: '/member-detail',
          params: { id: member.id },
        })),
    ];

    res.json(todos.slice(0, 10));
  } catch (error) {
    console.error('Todos error:', error);
    res.status(500).json({ error: '获取待办任务失败' });
  }
});

export default router;
