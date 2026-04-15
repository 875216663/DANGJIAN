import { Router } from 'express';
import { isDatabaseEnabled } from '../config/database';
import { DEMO_ACCOUNT_DIRECTORY, readStore, USER_DIRECTORY } from '../data/store';

const router = Router();

const ROLE_LABELS: Record<string, string> = {
  party_committee: '系统管理员',
  party_inspection: '系统管理员',
  branch_secretary: '系统管理员',
  branch_member: '系统管理员',
  member: '系统管理员',
};

function toUserView(
  user: { id: number; name: string; role: string; branch_id?: number },
  store: Awaited<ReturnType<typeof readStore>>
) {
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

router.get('/users', async (_req, res) => {
  try {
    const store = await readStore();
    const users = Object.values(USER_DIRECTORY)
      .sort((a, b) => a.id - b.id)
      .map((user) => toUserView(user, store));

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

router.get('/accounts', async (_req, res) => {
  try {
    const store = await readStore();
    const accounts = DEMO_ACCOUNT_DIRECTORY.map((account) => {
      const user = USER_DIRECTORY[account.user_id];
      return {
        user_id: account.user_id,
        username: account.username,
        password: account.password,
        description: account.description,
        user: toUserView(user, store),
      };
    });

    res.json({
      data: accounts,
      storage: isDatabaseEnabled() ? 'database' : 'local-file',
    });
  } catch (error) {
    console.error('Get auth accounts error:', error);
    res.status(500).json({ error: '获取演示账号失败' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: '请输入账号和密码' });
    }

    const matchedAccount = DEMO_ACCOUNT_DIRECTORY.find(
      (account) =>
        account.username === username.trim() &&
        account.password === password.trim()
    );

    if (!matchedAccount) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    const user = USER_DIRECTORY[matchedAccount.user_id];
    const store = await readStore();

    res.json({
      success: true,
      message: '登录成功',
      user: toUserView(user, store),
      storage: isDatabaseEnabled() ? 'database' : 'local-file',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

export default router;
