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
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      const message = error instanceof Error ? error.message : '登录失败，请稍后重试';
      console.error('Login error:', error);
      setLoginError(message);
      return { ok: false, error: message };
    } finally {
      setLoginPending(false);
    }
  }, []);

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
        <View className="flex-1 bg-gray-950 px-5 py-8">
          <View className="flex-1 justify-center">
            <View className="rounded-3xl border border-red-950/40 bg-red-900 px-5 py-6">
              <Text className="text-sm text-red-100">智慧党建基础信息管理系统</Text>
              <Text className="mt-2 text-3xl font-bold text-white">账号登录</Text>
              <Text className="mt-3 text-sm leading-6 text-red-100">
                保留登录体验与演示账号，同时底层接入真实后端与数据库。登录后默认进入 dashboard。
              </Text>
              <Text className="mt-4 text-xs text-red-100">{backendBaseUrl}</Text>
            </View>

            <View className="mt-5 rounded-3xl border border-gray-800 bg-gray-900 p-5">
              <Text className="text-base font-semibold text-white">登录系统</Text>
              <Text className="mt-2 text-sm text-gray-400">
                当前版本为单一管理角色系统，不同账号使用不同用户名登录，但进入后具备一致的管理权限。
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
                点击下方账号可自动填充用户名和密码，快速体验系统。
              </Text>

              <View className="mt-4">
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.username}
                    onPress={() => {
                      setUsername(account.username);
                      setPassword(account.password);
                      setLoginError('');
                    }}
                    className="mb-3 rounded-2xl border border-gray-800 bg-gray-950 px-4 py-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-semibold text-white">{account.user.name}</Text>
                        <Text className="mt-1 text-sm text-gray-400">
                          账号：{account.username} · 密码：{account.password}
                        </Text>
                        <Text className="mt-2 text-xs leading-5 text-gray-500">
                          {account.description}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          setUsername(account.username);
                          setPassword(account.password);
                          await login(account.username, account.password);
                        }}
                        className="ml-3 rounded-xl bg-gray-800 px-3 py-2"
                      >
                        <Text className="text-xs font-medium text-white">快捷登录</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
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
