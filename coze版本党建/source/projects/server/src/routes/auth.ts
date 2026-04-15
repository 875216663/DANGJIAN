import { Router } from 'express';
import { isDatabaseEnabled } from '../config/database';
import { readStore, USER_DIRECTORY } from '../data/store';

const router = Router();

const ROLE_LABELS: Record<string, string> = {
  party_committee: '党委领导',
  party_inspection: '党建纪检部',
  branch_secretary: '党支部书记',
  branch_member: '党支部委员',
  member: '普通党员',
};

router.get('/users', async (_req, res) => {
  try {
    const store = await readStore();
    const users = Object.values(USER_DIRECTORY)
      .sort((a, b) => a.id - b.id)
      .map((user) => ({
        ...user,
        role_label: ROLE_LABELS[user.role] || user.role,
        branch_name: user.branch_id
          ? store.branches.find((branch) => branch.id === user.branch_id)?.name
          : undefined,
      }));

    res.json({
      data: users,
      default_user_id: users[0]?.id,
      storage: isDatabaseEnabled() ? 'database' : 'local-file',
    });
  } catch (error) {
    console.error('Get auth users error:', error);
    res.status(500).json({ error: '获取用户目录失败' });
  }
});

export default router;
