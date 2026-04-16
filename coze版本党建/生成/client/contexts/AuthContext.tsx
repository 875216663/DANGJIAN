import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  type DemoAccount,
  getApiUrl,
  getBackendBaseUrl,
  getRequestUrl,
  requestJson,
  shouldAttachAuthHeaders,
  type AuthSessionPayload,
  type AuthSessionUser,
  type StorageMode,
  unwrapApiData,
} from '@/utils/api';

interface AuthContextType {
  user: AuthSessionUser | null;
  users: AuthSessionUser[];
  accounts: DemoAccount[];
  token: string | null;
  backendBaseUrl: string;
  storageMode: StorageMode;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUser: (userData: Partial<AuthSessionUser>) => void;
}

const AUTH_TOKEN_KEY = 'dangjian-auth-token-v3';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FALLBACK_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    user_id: 1,
    username: 'leader01',
    password: '123456',
    description: '党委管理员账号，可查看和维护全部支部与党员信息。',
    user: {
      id: 1,
      name: '张书记',
      username: 'leader01',
      role: 'party_committee',
      role_label: '党委管理员',
    },
  },
  {
    user_id: 2,
    username: 'office01',
    password: '123456',
    description: '第一支部管理员账号，仅维护综合管理党支部的数据。',
    user: {
      id: 2,
      name: '李委员',
      username: 'office01',
      role: 'branch_secretary',
      role_label: '支部管理员',
      branch_id: 1,
      branch_name: '综合管理党支部',
    },
  },
  {
    user_id: 3,
    username: 'branch01',
    password: '123456',
    description: '第二支部管理员账号，仅维护研发运营党支部的数据。',
    user: {
      id: 3,
      name: '王纪检',
      username: 'branch01',
      role: 'branch_secretary',
      role_label: '支部管理员',
      branch_id: 2,
      branch_name: '研发运营党支部',
    },
  },
  {
    user_id: 4,
    username: 'member01',
    password: '123456',
    description: '支部只读账号，可查看本支部信息，但不可新增、编辑或删除。',
    user: {
      id: 4,
      name: '赵同志',
      username: 'member01',
      role: 'branch_member',
      role_label: '支部只读账号',
      branch_id: 1,
      branch_name: '综合管理党支部',
    },
  },
  {
    user_id: 5,
    username: 'admin01',
    password: '123456',
    description: '巡检管理员账号，可跨支部查看与巡检数据。',
    user: {
      id: 5,
      name: '巡检管理员',
      username: 'admin01',
      role: 'party_inspection',
      role_label: '巡检管理员',
    },
  },
];

function getFriendlyNetworkMessage(rawMessage: string, backendBaseUrl: string) {
  if (/Failed to fetch|Network request failed|Load failed/i.test(rawMessage)) {
    return `无法连接后端服务。请确认前端环境变量 EXPO_PUBLIC_BACKEND_BASE_URL 指向 ${backendBaseUrl}，并在 Railway 中将 CORS_ORIGIN 设置为当前前端域名。`;
  }

  return rawMessage;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [users, setUsers] = useState<AuthSessionUser[]>([]);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [bootstrapError, setBootstrapError] = useState('');
  const originalFetchRef = useRef(globalThis.fetch.bind(globalThis));

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);

    try {
      const [usersResult, accountsResult, healthResult, storedToken] = await Promise.all([
        requestJson<AuthSessionUser[]>('/api/v1/auth/users'),
        requestJson<DemoAccount[]>('/api/v1/auth/accounts'),
        requestJson<{ status: string; storage: StorageMode }>('/api/v1/health'),
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
      ]);

      setUsers(usersResult.data);
      setAccounts(accountsResult.data);
      setBootstrapError('');
      setStorageMode(
        healthResult.data.storage ||
        (healthResult.payload && typeof healthResult.payload === 'object' && 'storage' in (healthResult.payload as Record<string, unknown>)
          ? ((healthResult.payload as Record<string, unknown>).storage as StorageMode)
          : 'unknown')
      );

      if (!storedToken) {
        setToken(null);
        setUser(null);
        return;
      }

      const sessionResponse = await originalFetchRef.current(getApiUrl('/api/v1/auth/session'), {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });
      const sessionPayload = await sessionResponse.json().catch(() => null);

      if (!sessionResponse.ok) {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        setToken(null);
        setUser(null);
        return;
      }

      const session = unwrapApiData<{ user: AuthSessionUser; storage: StorageMode }>(sessionPayload);
      setToken(storedToken);
      setUser(session.user);
      setStorageMode(session.storage || healthResult.data.storage || 'unknown');
    } catch (error) {
      console.error('Bootstrap auth session error:', error);
      setUsers([]);
      setAccounts([]);
      setToken(null);
      setUser(null);
      setStorageMode('unknown');
      setBootstrapError(
        getFriendlyNetworkMessage(
          error instanceof Error ? error.message : '初始化失败',
          backendBaseUrl
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [backendBaseUrl]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const originalFetch = originalFetchRef.current;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!shouldAttachAuthHeaders(input) || !token) {
        return originalFetch(input, init);
      }

      const requestHeaders =
        typeof Request !== 'undefined' && input instanceof Request
          ? input.headers
          : undefined;
      const headers = new Headers(requestHeaders);

      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => {
          headers.set(key, value);
        });
      }

      headers.set('Authorization', `Bearer ${token}`);

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    return () => {
      globalThis.fetch = originalFetch;
    };
  }, [token]);

  const login = useCallback(async (nextUsername: string, nextPassword: string) => {
    setLoginPending(true);
    setLoginError('');

    try {
      const { data } = await requestJson<AuthSessionPayload>('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: nextUsername,
          password: nextPassword,
        }),
      });

      setUser(data.user);
      setToken(data.token);
      setStorageMode(data.storage || 'unknown');
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setUsername('');
      setPassword('');

      return { ok: true };
    } catch (error) {
      const message = getFriendlyNetworkMessage(
        error instanceof Error ? error.message : '登录失败，请稍后重试',
        backendBaseUrl
      );
      console.error('Login error:', error);
      setLoginError(message);
      return { ok: false, error: message };
    } finally {
      setLoginPending(false);
    }
  }, [backendBaseUrl]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((userData: Partial<AuthSessionUser>) => {
    setUser((currentUser) => (currentUser ? { ...currentUser, ...userData } : currentUser));
    setUsers((currentUsers) =>
      currentUsers.map((item) => (item.id === user?.id ? { ...item, ...userData } : item))
    );
  }, [user?.id]);

  const value: AuthContextType = {
    user,
    users,
    accounts,
    token,
    backendBaseUrl,
    storageMode,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    logout,
    refreshSession,
    updateUser,
  };

  const displayedAccounts = accounts.length > 0 ? accounts : FALLBACK_DEMO_ACCOUNTS;

  if (isLoading) {
    return (
      <AuthContext.Provider value={value}>
        <View className="flex-1 items-center justify-center bg-gray-950">
          <ActivityIndicator size="large" color="#DC2626" />
          <Text className="mt-4 text-base text-white">正在连接党建数据中心...</Text>
          <Text className="mt-2 text-sm text-gray-400">{getRequestUrl(getApiUrl('/api/v1/health'))}</Text>
        </View>
      </AuthContext.Provider>
    );
  }

  if (!user || !token) {
    return (
      <AuthContext.Provider value={value}>
        <ScrollView
          className="flex-1 bg-gray-950"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="min-h-full justify-center">
            <View className="rounded-3xl border border-red-950/40 bg-red-900 px-5 py-6">
              <Text className="text-sm text-red-100">智慧党建基础信息管理系统</Text>
              <Text className="mt-2 text-3xl font-bold text-white">账号登录</Text>
              <Text className="mt-3 text-sm leading-6 text-red-100">
                不同账号会进入不同权限与数据视角。登录后默认进入 dashboard，并直接连接真实后端与数据库。
              </Text>
              <Text className="mt-4 text-xs text-red-100">{backendBaseUrl}</Text>
            </View>

            {bootstrapError ? (
              <View className="mt-5 rounded-3xl border border-yellow-900/40 bg-yellow-950/30 p-5">
                <Text className="text-base font-semibold text-yellow-300">后端连接异常</Text>
                <Text className="mt-2 text-sm leading-6 text-yellow-100">{bootstrapError}</Text>
                <TouchableOpacity
                  onPress={refreshSession}
                  className="mt-4 rounded-2xl border border-yellow-700 bg-yellow-900/40 px-4 py-3"
                >
                  <Text className="text-center font-medium text-white">重新检测连接</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View className="mt-5 rounded-3xl border border-gray-800 bg-gray-900 p-5">
              <Text className="text-base font-semibold text-white">登录系统</Text>
              <Text className="mt-2 text-sm text-gray-400">
                当前版本支持党委管理员、支部管理员、巡检管理员和只读账号，不同账号进入后看到的按钮与数据范围会不同。
              </Text>

              <View className="mt-5">
                <Text className="mb-2 text-sm text-gray-400">账号</Text>
                <TextInput
                  className="rounded-2xl border border-gray-700 bg-gray-800 px-4 py-3 text-white"
                  placeholder="请输入账号"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm text-gray-400">密码</Text>
                <TextInput
                  className="rounded-2xl border border-gray-700 bg-gray-800 px-4 py-3 text-white"
                  placeholder="请输入密码"
                  placeholderTextColor="#6B7280"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {loginError ? (
                <Text className="mt-3 text-sm text-red-400">{loginError}</Text>
              ) : (
                <Text className="mt-3 text-xs text-gray-500">
                  默认演示密码均为 `123456`
                </Text>
              )}

              <View className="mt-4 flex-row flex-wrap">
                {displayedAccounts.map((account) => (
                  <TouchableOpacity
                    key={`quick-fill-${account.username}`}
                    onPress={() => {
                      setUsername(account.username);
                      setPassword(account.password);
                      setLoginError('');
                    }}
                    className="mb-2 mr-2 rounded-full border border-gray-700 bg-gray-800 px-3 py-2"
                  >
                    <Text className="text-xs text-white">{account.username}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                disabled={loginPending}
                onPress={async () => {
                  await login(username.trim(), password.trim());
                }}
                className={`mt-5 rounded-2xl py-3 ${loginPending ? 'bg-red-950/40' : 'bg-red-900'}`}
              >
                <Text className="text-center font-medium text-white">
                  {loginPending ? '登录中...' : '登录系统'}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mt-5 rounded-3xl border border-gray-800 bg-gray-900 p-5">
              <Text className="text-base font-semibold text-white">演示账号</Text>
              <Text className="mt-2 text-sm text-gray-400">
                点击下方账号可一键填充，或直接登录体验不同权限与不同数据范围。
              </Text>

              <View className="mt-4">
                {displayedAccounts.map((account) => (
                  <View
                    key={account.username}
                    className="mb-3 rounded-2xl border border-gray-800 bg-gray-950 px-4 py-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-semibold text-white">{account.user.name}</Text>
                        <Text className="mt-1 text-xs text-red-300">
                          {account.user.role_label}
                          {account.user.branch_name ? ` · ${account.user.branch_name}` : ''}
                        </Text>
                        <Text className="mt-1 text-sm text-gray-400">
                          账号：{account.username} · 密码：{account.password}
                        </Text>
                        <Text className="mt-2 text-xs leading-5 text-gray-500">
                          {account.description}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-4 flex-row">
                      <TouchableOpacity
                        onPress={() => {
                          setUsername(account.username);
                          setPassword(account.password);
                          setLoginError('');
                        }}
                        className="mr-3 flex-1 rounded-xl border border-gray-700 bg-gray-900 px-3 py-3"
                      >
                        <Text className="text-center text-xs font-medium text-white">一键填充</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          setUsername(account.username);
                          setPassword(account.password);
                          await login(account.username, account.password);
                        }}
                        className="flex-1 rounded-xl bg-gray-800 px-3 py-3"
                      >
                        <Text className="text-center text-xs font-medium text-white">快捷登录</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
