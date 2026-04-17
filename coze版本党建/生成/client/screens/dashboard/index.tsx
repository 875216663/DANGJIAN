import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { requestJson } from '@/utils/api';
import {
  canCreateBranch,
  canCreateMember,
  canViewBranchModule,
  getDashboardSubtitle,
  isBranchSecretary,
  isCommitteeLeader,
  isPartyAdmin,
  isPartyMember,
} from '@/utils/rbac';

interface DashboardSummary {
  memberCount: number;
  branchCount: number;
  activeCount: number;
  probationaryCount: number;
  branchWithSecretaryCount: number;
  feeCompletionRate: number;
  meetingCompletionRate: number;
  probationaryWarningCount: number;
  studyCompletionRate: number;
}

interface DashboardTodo {
  type: string;
  title: string;
  description: string;
  route?: string;
  params?: Record<string, unknown>;
}

interface DashboardAlert {
  id: string;
  alert_type: string;
  alert_level: string;
  description: string;
}

export default function Dashboard() {
  const router = useSafeRouter();
  const { user, accounts, login, logout, storageMode, backendBaseUrl } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [todos, setTodos] = useState<DashboardTodo[]>([]);
  const [stats, setStats] = useState<DashboardSummary>({
    memberCount: 0,
    branchCount: 0,
    activeCount: 0,
    probationaryCount: 0,
    branchWithSecretaryCount: 0,
    feeCompletionRate: 0,
    meetingCompletionRate: 0,
    probationaryWarningCount: 0,
    studyCompletionRate: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, membersRes, branchesRes, alertsRes, todosRes] = await Promise.all([
        requestJson<DashboardSummary>('/api/v1/dashboard'),
        requestJson<any[]>('/api/v1/members?page=1&limit=5'),
        requestJson<any[]>('/api/v1/branches'),
        requestJson<DashboardAlert[]>('/api/v1/dashboard/alerts'),
        requestJson<DashboardTodo[]>('/api/v1/dashboard/todos'),
      ]);

      setStats({
        memberCount: summaryRes.data.memberCount || 0,
        branchCount: summaryRes.data.branchCount || 0,
        activeCount: summaryRes.data.activeCount || 0,
        probationaryCount: summaryRes.data.probationaryCount || 0,
        branchWithSecretaryCount: summaryRes.data.branchWithSecretaryCount || 0,
        feeCompletionRate: summaryRes.data.feeCompletionRate || 0,
        meetingCompletionRate: summaryRes.data.meetingCompletionRate || 0,
        probationaryWarningCount: summaryRes.data.probationaryWarningCount || 0,
        studyCompletionRate: summaryRes.data.studyCompletionRate || 0,
      });
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : []);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setTodos(Array.isArray(todosRes.data) ? todosRes.data : []);
    } catch (error) {
      console.error('Load dashboard data error:', error);
      setMembers([]);
      setBranches([]);
      setAlerts([]);
      setTodos([]);
      setStats({
        memberCount: 0,
        branchCount: 0,
        activeCount: 0,
        probationaryCount: 0,
        branchWithSecretaryCount: 0,
        feeCompletionRate: 0,
        meetingCompletionRate: 0,
        probationaryWarningCount: 0,
        studyCompletionRate: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const canAddBranch = canCreateBranch(user);
  const canAddMember = canCreateMember(user);
  const showBranchModule = canViewBranchModule(user);
  const recentMembers = members.slice(0, 4);
  const recentBranches = branches.slice(0, 3);

  const quickActions = useMemo(() => {
    const items = [
      {
        id: 'branches',
        label: '党支部',
        icon: 'building-columns',
        route: '/branches',
        visible: showBranchModule,
      },
      {
        id: 'members',
        label: isPartyMember(user) ? '我的档案' : '党员管理',
        icon: 'users',
        route: isPartyMember(user) && user?.member_id ? '/member-detail' : '/members',
        params: isPartyMember(user) && user?.member_id ? { id: user.member_id } : undefined,
        visible: true,
      },
      {
        id: 'member-create',
        label: '发展党员',
        icon: 'user-plus',
        route: '/member-edit',
        visible: canAddMember,
      },
      {
        id: 'branch-create',
        label: '新建支部',
        icon: 'plus',
        route: '/branch-edit',
        visible: canAddBranch,
      },
      {
        id: 'meetings',
        label: '三会一课',
        icon: 'calendar-check',
        route: '/meetings',
        visible: true,
      },
      {
        id: 'study',
        label: '学习中心',
        icon: 'book-open',
        route: '/study',
        visible: true,
      },
      {
        id: 'reports',
        label: '报表导出',
        icon: 'chart-column',
        route: '/admin',
        visible: !isPartyMember(user),
      },
      {
        id: 'profile',
        label: '我的信息',
        icon: 'id-card',
        route: isPartyMember(user) && user?.member_id ? '/member-detail' : '/members',
        params: isPartyMember(user) && user?.member_id ? { id: user.member_id } : undefined,
        visible: true,
      },
    ];

    return items.filter((item) => item.visible).slice(0, 8);
  }, [canAddBranch, canAddMember, showBranchModule, user]);

  const workSummary = useMemo(() => {
    if (isPartyAdmin(user)) {
      return '当前账号可维护支部与党员基础数据，并负责正式落库。';
    }
    if (isBranchSecretary(user)) {
      return `当前账号仅维护“${user?.branch_name || '本支部'}”党员，并同步生成普通党员账号。`;
    }
    if (isCommitteeLeader(user)) {
      return '当前账号为领导视角，只查看全公司党建总览和组织统计。';
    }
    return '当前账号仅查看本人档案和所属支部信息。';
  }, [user]);

  return (
    <Screen>
      <View className="flex-1 bg-[#FFF7F5]">
        <View className="bg-red-800 px-4 pb-5 pt-12">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <FontAwesome6 name="flag" size={20} color="white" />
              </View>
              <View>
                <Text className="text-lg font-bold text-white">智慧党建基础信息管理系统</Text>
                <Text className="text-xs text-red-100">{getDashboardSubtitle(user)}</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity className="mr-2 rounded-full bg-white/15 px-3 py-2">
                <View>
                  <FontAwesome6 name="bell" size={16} color="white" />
                  {alerts.length > 0 ? (
                    <View className="absolute -right-2 -top-2 rounded-full bg-white px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-red-700">{Math.min(alerts.length, 9)}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSwitcherVisible(true)}
                className="rounded-full bg-white/15 px-3 py-2"
              >
                <FontAwesome6 name="user" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-4 rounded-3xl bg-white/10 px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs text-red-100">当前账号</Text>
                <Text className="mt-1 text-xl font-bold text-white">{user?.name || '未识别账号'}</Text>
                <Text className="mt-1 text-sm text-red-100">
                  {user?.role_label || '未知角色'}
                  {user?.branch_name ? ` ｜ ${user.branch_name}` : ' ｜ 全公司视角'}
                </Text>
              </View>
              <View className="rounded-2xl bg-white/10 px-3 py-2">
                <Text className="text-[11px] text-red-100">
                  {storageMode === 'database' ? 'Neon 数据库' : '本地模式'}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-xs leading-5 text-red-100">{workSummary}</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B91C1C" />
          }
        >
          <View className="px-4 py-5">
            <SectionHeader title="数据看板" actionLabel={loading ? '刷新中' : '查看概览'} />
            <View className="flex-row flex-wrap justify-between">
              <StatCard icon="users" label="党员总数" value={stats.memberCount} tone="primary" />
              <StatCard icon="building-columns" label="支部总数" value={stats.branchCount} tone="secondary" />
              <StatCard icon="triangle-exclamation" label="换届提醒" value={stats.probationaryWarningCount} tone="warning" />
              <StatCard icon="coins" label="党费完成率" value={`${stats.feeCompletionRate}%`} tone="success" />
              <StatCard icon="calendar-check" label="组织生活达标率" value={`${stats.meetingCompletionRate}%`} tone="secondary" />
              <StatCard icon="book-open" label="学习完成率" value={`${stats.studyCompletionRate}%`} tone="primary" />
            </View>

            <SectionHeader title="快捷入口" />
            <View className="rounded-[28px] border border-red-100 bg-white px-4 py-5">
              <View className="flex-row flex-wrap justify-between">
                {quickActions.map((item) => (
                  <QuickActionCard
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    onPress={() => router.push(item.route, item.params || {})}
                  />
                ))}
              </View>
            </View>

            <SectionHeader
              title="待办任务"
              actionLabel={todos.length > 0 ? `共 ${todos.length} 项` : undefined}
            />
            <View className="rounded-[28px] border border-red-100 bg-white">
              {todos.length === 0 ? (
                <EmptyBlock text="当前暂无待办任务，系统已处于较稳定状态。" />
              ) : (
                todos.slice(0, 6).map((todo, index) => (
                  <TaskRow
                    key={`${todo.type}-${todo.title}-${index}`}
                    icon={getTodoIcon(todo.type)}
                    title={todo.title}
                    description={todo.description}
                    onPress={todo.route ? () => router.push(todo.route, todo.params || {}) : undefined}
                    bordered={index < Math.min(todos.length, 6) - 1}
                  />
                ))
              )}
            </View>

            <SectionHeader
              title="风险提醒"
              actionLabel={alerts.length > 0 ? `共 ${alerts.length} 条` : undefined}
            />
            <View className="rounded-[28px] border border-red-100 bg-white">
              {alerts.length === 0 ? (
                <EmptyBlock text="当前没有新的风险提醒。" />
              ) : (
                alerts.slice(0, 5).map((alert, index) => (
                  <AlertRow
                    key={alert.id}
                    title={alert.alert_type}
                    description={alert.description}
                    level={alert.alert_level}
                    bordered={index < Math.min(alerts.length, 5) - 1}
                  />
                ))
              )}
            </View>

            <View className="mt-6 flex-row justify-between">
              <View className="rounded-[28px] border border-red-100 bg-white p-4" style={{ width: '48%' }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-red-700">党员管理</Text>
                  <TouchableOpacity onPress={() => router.push('/members')}>
                    <Text className="text-xs text-red-700">查看全部</Text>
                  </TouchableOpacity>
                </View>
                <View className="mt-4">
                  {recentMembers.length === 0 ? (
                    <EmptyInline text="暂无党员数据" />
                  ) : (
                    recentMembers.map((member, index) => (
                      <MiniRow
                        key={member.id}
                        title={member.name}
                        subtitle={`${member.department || '未设置部门'} ｜ ${member.branch_name || '未分配支部'}`}
                        onPress={() => router.push('/member-detail', { id: member.id })}
                        bordered={index < recentMembers.length - 1}
                      />
                    ))
                  )}
                </View>
              </View>

              <View className="rounded-[28px] border border-red-100 bg-white p-4" style={{ width: '48%' }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-red-700">党支部管理</Text>
                  {showBranchModule ? (
                    <TouchableOpacity onPress={() => router.push('/branches')}>
                      <Text className="text-xs text-red-700">查看全部</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View className="mt-4">
                  {recentBranches.length === 0 ? (
                    <EmptyInline text="暂无支部数据" />
                  ) : (
                    recentBranches.map((branch, index) => (
                      <MiniRow
                        key={branch.id}
                        title={branch.name}
                        subtitle={`书记：${branch.secretary_name || '未设置'} ｜ 党员 ${branch.member_count || 0} 名`}
                        onPress={
                          showBranchModule ? () => router.push('/branch-detail', { id: branch.id }) : undefined
                        }
                        bordered={index < recentBranches.length - 1}
                      />
                    ))
                  )}
                </View>
              </View>
            </View>

            <View className="mt-6 rounded-[28px] border border-red-100 bg-white px-4 py-4">
              <Text className="text-base font-semibold text-red-700">系统连接信息</Text>
              <Text className="mt-3 text-xs text-slate-500">{backendBaseUrl}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={switcherVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSwitcherVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/30">
          <View className="rounded-t-3xl bg-white px-4 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-red-700">切换演示账号</Text>
              <TouchableOpacity onPress={() => setSwitcherVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#B91C1C" />
              </TouchableOpacity>
            </View>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.username}
                onPress={async () => {
                  await login(account.username, account.password);
                  setSwitcherVisible(false);
                }}
                className={`mb-3 rounded-2xl border px-4 py-4 ${
                  account.user.id === user?.id
                    ? 'border-red-300 bg-red-50'
                    : 'border-red-100 bg-white'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-900">{account.user.name}</Text>
                    <Text className="mt-1 text-sm text-slate-600">
                      账号：{account.username} · 密码：{account.password}
                    </Text>
                    <Text className="mt-1 text-xs text-red-600">
                      {account.user.role_label}
                      {account.user.branch_name ? ` · ${account.user.branch_name}` : ''}
                    </Text>
                    <Text className="mt-2 text-xs leading-5 text-slate-500">
                      {account.description}
                    </Text>
                  </View>
                  {account.user.id === user?.id ? (
                    <FontAwesome6 name="circle-check" size={18} color="#DC2626" />
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={async () => {
                await logout();
                setSwitcherVisible(false);
              }}
              className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4"
            >
              <Text className="text-center font-semibold text-red-700">退出当前账号</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function SectionHeader({
  title,
  actionLabel,
}: {
  title: string;
  actionLabel?: string;
}) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="text-lg font-bold text-slate-900">{title}</Text>
      {actionLabel ? <Text className="text-xs text-red-700">{actionLabel}</Text> : null}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: 'primary' | 'secondary' | 'warning' | 'success';
}) {
  const palette = {
    primary: { icon: '#B91C1C', bg: '#FFF1F2' },
    secondary: { icon: '#991B1B', bg: '#FEF2F2' },
    warning: { icon: '#EA580C', bg: '#FFF7ED' },
    success: { icon: '#15803D', bg: '#F0FDF4' },
  }[tone];

  return (
    <View className="mb-3 rounded-[24px] border border-red-100 bg-white p-4" style={{ width: '48.5%' }}>
      <View
        className="h-10 w-10 items-center justify-center rounded-2xl"
        style={{ backgroundColor: palette.bg }}
      >
        <FontAwesome6 name={icon} size={18} color={palette.icon} />
      </View>
      <Text className="mt-4 text-2xl font-bold text-slate-900">{value}</Text>
      <Text className="mt-1 text-xs text-slate-500">{label}</Text>
    </View>
  );
}

function QuickActionCard({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-4 items-center"
      style={{ width: '24%' }}
    >
      <View className="h-14 w-14 items-center justify-center rounded-2xl border border-red-100 bg-red-50">
        <FontAwesome6 name={icon} size={20} color="#B91C1C" />
      </View>
      <Text className="mt-2 text-center text-xs leading-4 text-slate-600">{label}</Text>
    </TouchableOpacity>
  );
}

function TaskRow({
  icon,
  title,
  description,
  onPress,
  bordered,
}: {
  icon: any;
  title: string;
  description: string;
  onPress?: () => void;
  bordered?: boolean;
}) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      onPress={onPress}
      className={`flex-row items-center px-4 py-4 ${bordered ? 'border-b border-red-100' : ''}`}
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-red-50">
        <FontAwesome6 name={icon} size={16} color="#B91C1C" />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-slate-900">{title}</Text>
        <Text className="mt-1 text-xs leading-5 text-slate-500">{description}</Text>
      </View>
      {onPress ? <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" /> : null}
    </Container>
  );
}

function AlertRow({
  title,
  description,
  level,
  bordered,
}: {
  title: string;
  description: string;
  level: string;
  bordered?: boolean;
}) {
  const tone =
    level === 'critical'
      ? { bg: '#FEF2F2', text: '#B91C1C', label: '高优先' }
      : { bg: '#FFF7ED', text: '#C2410C', label: '提醒' };

  return (
    <View className={`px-4 py-4 ${bordered ? 'border-b border-red-100' : ''}`}>
      <View className="flex-row items-center justify-between">
        <Text className="font-medium text-slate-900">{title}</Text>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: tone.bg }}>
          <Text className="text-[11px] font-medium" style={{ color: tone.text }}>
            {tone.label}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-xs leading-5 text-slate-500">{description}</Text>
    </View>
  );
}

function MiniRow({
  title,
  subtitle,
  onPress,
  bordered,
}: {
  title: string;
  subtitle: string;
  onPress?: () => void;
  bordered?: boolean;
}) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      onPress={onPress}
      className={`py-3 ${bordered ? 'border-b border-red-100' : ''}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-medium text-slate-900">{title}</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</Text>
        </View>
        {onPress ? <FontAwesome6 name="chevron-right" size={12} color="#94A3B8" /> : null}
      </View>
    </Container>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <View className="px-4 py-6">
      <Text className="text-sm text-slate-500">{text}</Text>
    </View>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <Text className="text-sm text-slate-500">{text}</Text>;
}

function getTodoIcon(type: string) {
  if (type === 'approval') {
    return 'clipboard-check';
  }
  if (type === 'meeting') {
    return 'calendar-days';
  }
  return 'book-open';
}
