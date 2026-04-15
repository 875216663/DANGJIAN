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
import { ActivityIndicator, Text, View } from 'react-native';
import {
  getApiUrl,
  getBackendBaseUrl,
  getRequestUrl,
  shouldAttachAuthHeaders,
  type AuthSessionUser,
  type StorageMode,
} from '@/utils/api';

interface AuthContextType {
  user: AuthSessionUser | null;
  users: AuthSessionUser[];
  token: string | null;
  backendBaseUrl: string;
  storageMode: StorageMode;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (userId: number) => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUser: (userData: Partial<AuthSessionUser>) => void;
}

const AUTH_STORAGE_KEY = 'dangjian-auth-user-id';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [users, setUsers] = useState<AuthSessionUser[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const originalFetchRef = useRef(globalThis.fetch.bind(globalThis));

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  const setActiveUserById = useCallback(async (nextUsers: AuthSessionUser[], userId?: number) => {
    const fallbackUser = nextUsers[0] || null;
    const matchedUser = userId
      ? nextUsers.find((item) => item.id === userId) || fallbackUser
      : fallbackUser;

    setUser(matchedUser);

    if (matchedUser) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, String(matchedUser.id));
    } else {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, healthRes, storedUserId] = await Promise.all([
        originalFetchRef.current(getApiUrl('/api/v1/auth/users')),
        originalFetchRef.current(getApiUrl('/api/v1/health')),
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
      ]);

      const usersPayload = usersRes.ok ? await usersRes.json() : { data: [] };
      const healthPayload = healthRes.ok ? await healthRes.json() : { storage: 'unknown' };
      const nextUsers = Array.isArray(usersPayload.data) ? usersPayload.data : [];

      setUsers(nextUsers);
      setStorageMode(healthPayload.storage || usersPayload.storage || 'unknown');

      await setActiveUserById(
        nextUsers,
        storedUserId ? Number.parseInt(storedUserId, 10) : usersPayload.default_user_id
      );
    } catch (error) {
      console.error('Bootstrap auth session error:', error);
      setUsers([]);
      setUser(null);
      setStorageMode('unknown');
    } finally {
      setIsLoading(false);
    }
  }, [setActiveUserById]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const originalFetch = originalFetchRef.current;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!shouldAttachAuthHeaders(input) || !user) {
        return originalFetch(input, init);
      }

      const inputHeaders =
        typeof Request !== 'undefined' && input instanceof Request
          ? input.headers
          : undefined;
      const headers = new Headers(inputHeaders);

      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => {
          headers.set(key, value);
        });
      }

      headers.set('x-user-id', String(user.id));
      headers.set('x-user-role', user.role);

      if (user.branch_id) {
        headers.set('x-user-branch-id', String(user.branch_id));
      } else {
        headers.delete('x-user-branch-id');
      }

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    return () => {
      globalThis.fetch = originalFetch;
    };
  }, [user]);

  const switchUser = useCallback(async (userId: number) => {
    await setActiveUserById(users, userId);
  }, [setActiveUserById, users]);

  const login = useCallback(async (token: string) => {
    const userId = Number.parseInt(token, 10);
    if (!Number.isNaN(userId)) {
      await switchUser(userId);
    }
  }, [switchUser]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(users[0] || null);
    if (users[0]) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, String(users[0].id));
    }
  }, [users]);

  const updateUser = useCallback((userData: Partial<AuthSessionUser>) => {
    setUser((currentUser) => (currentUser ? { ...currentUser, ...userData } : currentUser));
    setUsers((currentUsers) =>
      currentUsers.map((item) => (item.id === user?.id ? { ...item, ...userData } : item))
    );
  }, [user?.id]);

  const value: AuthContextType = {
    user,
    users,
    token: user ? String(user.id) : null,
    backendBaseUrl,
    storageMode,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    logout,
    switchUser,
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
