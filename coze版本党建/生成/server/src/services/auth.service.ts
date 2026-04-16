import { DEMO_ACCOUNT_DIRECTORY, USER_DIRECTORY, toUserView } from '../models/auth.model';
import { isDatabaseEnabled } from '../config/database';
import { AppError } from '../utils/app-error';
import { createAuthToken } from '../utils/token';
import { readStore } from '../models/store.model';
import type { CurrentUserContext } from '../middlewares/auth.middleware';
import { getTokenExpiryHours } from '../middlewares/auth.middleware';

export async function listUsers() {
  const store = await readStore();
  const users = Object.values(USER_DIRECTORY)
    .sort((a, b) => a.id - b.id)
    .map((user) => toUserView(user, store));

  return {
    users,
    defaultUserId: users[0]?.id,
    storage: isDatabaseEnabled() ? 'database' : 'local-file',
  };
}

export async function listDemoAccounts() {
  const store = await readStore();
  return {
    accounts: DEMO_ACCOUNT_DIRECTORY.map((account) => ({
      user_id: account.user_id,
      username: account.username,
      password: account.password,
      description: account.description,
      user: toUserView(USER_DIRECTORY[account.user_id], store),
    })),
    storage: isDatabaseEnabled() ? 'database' : 'local-file',
  };
}

export async function login(username: string, password: string) {
  const matchedAccount = DEMO_ACCOUNT_DIRECTORY.find(
    (account) => account.username === username && account.password === password
  );

  if (!matchedAccount) {
    throw new AppError(401, '账号或密码错误');
  }

  const user = USER_DIRECTORY[matchedAccount.user_id];
  const store = await readStore();

  return {
    token: createAuthToken({
      userId: user.id,
      role: user.role,
      branchId: user.branch_id,
      username: matchedAccount.username,
    }),
    user: toUserView(user, store),
    expiresInHours: getTokenExpiryHours(),
    storage: isDatabaseEnabled() ? 'database' : 'local-file',
  };
}

export async function getSession(currentUser: CurrentUserContext) {
  const user = USER_DIRECTORY[currentUser.userId];
  if (!user) {
    throw new AppError(401, '用户会话不存在');
  }

  const store = await readStore();
  return {
    user: toUserView(user, store),
    storage: isDatabaseEnabled() ? 'database' : 'local-file',
  };
}
