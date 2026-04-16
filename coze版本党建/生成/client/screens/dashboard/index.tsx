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
  isPartyAdmin,
  isPartyMember,
} from '@/utils/rbac';

const PLANNED_FEATURES = [
  { id: 'meetings', name: '三会一课', icon: 'calendar-check', route: '/meetings' },
  { id: 'study', name: '学习教育', icon: 'book-open', route: '/study' },
  { id: 'supervision', name: '纪检监督', icon: 'shield-halved', route: '/supervision' },
  { id: 'admin', name: '系统管理', icon: 'gear', route: '/admin' },
];

export default function Dashboard() {
  const router = useSafeRouter();
  const { user, accounts, login, logout, storageMode, backendBaseUrl } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [stats, setStats] = useState({
    memberCount: 0,
    branchCount: 0,
    activeCount: 0,
    probationaryCount: 0,
    branchWithSecretaryCount: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, membersRes, branchesRes] = await Promise.all([
        requestJson<{
          memberCount: number;
          branchCount: number;
          activeCount: number;
          probationaryCount: number;
          branchWithSecretaryCount: number;
        }>('/api/v1/dashboard'),
        requestJson<any[]>('/api/v1/members?page=1&limit=4'),
        requestJson<any[]>('/api/v1/branches'),
      ]);

      setStats({
        memberCount: summaryRes.data.memberCount || 0,
        branchCount: summaryRes.data.branchCount || 0,
        activeCount: summaryRes.data.activeCount || 0,
        probationaryCount: summaryRes.data.probationaryCount || 0,
        branchWithSecretaryCount: summaryRes.data.branchWithSecretaryCount || 0,
      });
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : []);
    } catch (error) {
      console.error('Load dashboard data error:', error);
      setMembers([]);
      setBranches([]);
      setStats({
        memberCount: 0,
        branchCount: 0,
        activeCount: 0,
        probationaryCount: 0,
        branchWithSecretaryCount: 0,
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
  const featuredMembers = members.slice(0, 4);
  const featuredBranches = branches.slice(0, 4);

  const roleTips = useMemo(() => {
    if (isPartyAdmin(user)) {
      return [
        '可新建党支部并维护全公司支部基础信息。',
        '可新增党员，并在保存时同步生成普通党员登录账号。',
        '可查看全公司党员、支部和首页统计数据。',
      ];
    }

    if (canAddMember) {
      return [
        '仅可维护本支部党员资料，不能跨支部新增党员。',
        '新增党员时会自动绑定到当前支部，并同步生成普通党员账号。',
        '不可新建党支部，但可查看本支部看板和名单。',
      ];
    }

    if (isPartyMember(user)) {
      return [
        '当前账号仅展示个人党员档案和所属支部信息。',
        '不显示创建入口，也无法修改基础数据。',
        '如需补录或变更资料，请联系党建纪检部或支部书记。 ',
      ];
    }

    return [
      '当前角色为只读，总览数据默认按全公司维度展示。',
      '可查看党支部、党员和首页统计，但不显示任何创建按钮。',
      '适合党委领导快速浏览组织运行情况。',
    ];
  }, [user, canAddMember]);

  return (
    <Screen>
      <View className="flex-1 bg-red-50">
        <View className="bg-red-700 px-4 pb-5 pt-12">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <FontAwesome6 name="flag" size={20} color="white" />
              </View>
              <View>
                <Text className="text-lg font-bold text-white">党建管理系统</Text>
                <Text className="text-xs text-red-100">{getDashboardSubtitle(user)}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setSwitcherVisible(true)}
              className="rounded-full bg-white/15 px-3 py-2"
            >
              <FontAwesome6 name="users" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setSwitcherVisible(true)}
            activeOpacity={0.9}
            className="mt-5 rounded-3xl bg-white/12 px-4 py-4"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-sm text-red-100">当前登录账号</Text>
                <Text className="mt-1 text-xl font-bold text-white">{user?.name || '未识别账号'}</Text>
                <Text className="mt-1 text-sm text-red-100">
                  {user?.role_label || '未知角色'}
                  {user?.branch_name ? ` · ${user.branch_name}` : ' · 全局视角'}
                </Text>
                <Text className="mt-1 text-xs text-red-100">登录账号：{user?.username || '-'}</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-red-100">
                  {storageMode === 'database' ? 'Neon 数据库' : '本地文件模式'}
                </Text>
                <Text className="mt-2 text-xs text-red-100">点击切换账号</Text>
              </View>
            </View>
            <Text className="mt-3 text-xs text-red-100">{backendBaseUrl}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
          }
        >
          <View className="px-4 py-5">
            <View className="rounded-3xl border border-red-100 bg-white p-5">
              <Text className="text-lg font-bold text-red-700">角色工作重点</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">
                当前系统已经将四级角色融入到首页和主链路中，创建支部、创建党员、数据范围和按钮显示都会随账号变化。
              </Text>
              <View className="mt-4">
                {roleTips.map((tip, index) => (
                  <Text key={tip} className="text-sm leading-6 text-slate-600">
                    {index + 1}. {tip}
                  </Text>
                ))}
              </View>

              <View className="mt-5 flex-row">
                <TouchableOpacity
                  onPress={() => router.push(isPartyMember(user) && user?.member_id ? '/member-detail' : '/members', isPartyMember(user) && user?.member_id ? { id: user.member_id } : undefined)}
                  className="mr-3 flex-1 rounded-2xl bg-red-700 px-4 py-4"
                >
                  <FontAwesome6 name="users" size={20} color="white" />
                  <Text className="mt-3 font-semibold text-white">
                    {isPartyMember(user) ? '我的党员档案' : '党员信息管理'}
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-red-100">
                    {isPartyMember(user)
                      ? '查看个人党员信息和所属支部'
                      : '真实落库，支持新增党员并同步创建账号'}
                  </Text>
                </TouchableOpacity>
                {showBranchModule ? (
                  <TouchableOpacity
                    onPress={() => router.push('/branches')}
                    className="flex-1 rounded-2xl border border-red-200 bg-red-50 px-4 py-4"
                  >
                    <FontAwesome6 name="building-columns" size={20} color="#DC2626" />
                    <Text className="mt-3 font-semibold text-red-700">党支部管理</Text>
                    <Text className="mt-1 text-xs leading-5 text-slate-500">
                      查看组织结构、书记信息和支部名单
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View className="mt-6">
              <Text className="mb-3 text-lg font-bold text-red-700">数据概览</Text>
              <View className="grid grid-cols-2 gap-3">
                <StatCard icon="users" label="党员总数" value={stats.memberCount} color="#DC2626" />
                <StatCard icon="building-columns" label="支部总数" value={stats.branchCount} color="#BE123C" />
                <StatCard icon="user-check" label="正式党员" value={stats.activeCount} color="#B91C1C" />
                <StatCard icon="user-clock" label="预备党员" value={stats.probationaryCount} color="#F97316" />
              </View>
            </View>

            <View className="mt-6">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-red-700">
                  {isPartyMember(user) ? '我的党员信息' : '党员信息管理'}
                </Text>
                {canAddMember ? (
                  <TouchableOpacity onPress={() => router.push('/member-edit')}>
                    <Text className="text-sm font-medium text-red-700">新建党员</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View className="rounded-3xl border border-red-100 bg-white p-4">
                {loading ? (
                  <EmptyLine text="正在加载党员数据..." />
                ) : featuredMembers.length === 0 ? (
                  <EmptyLine text="暂无党员数据，请先录入党员基础信息。" />
                ) : (
                  featuredMembers.map((member, index) => (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => router.push('/member-detail', { id: member.id })}
                      className={`flex-row items-center justify-between py-3 ${
                        index < featuredMembers.length - 1 ? 'border-b border-red-100' : ''
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-slate-900">{member.name}</Text>
                        <Text className="mt-1 text-sm text-slate-500">
                          {member.department || '未设置部门'} · {member.branch_name || '未分配支部'}
                        </Text>
                      </View>
                      <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  ))
                )}
                {!isPartyMember(user) ? (
                  <TouchableOpacity
                    onPress={() => router.push('/members')}
                    className="mt-4 rounded-2xl border border-red-200 bg-red-50 py-3"
                  >
                    <Text className="text-center font-medium text-red-700">进入党员管理</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {showBranchModule ? (
              <View className="mt-6">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-red-700">党支部信息管理</Text>
                  {canAddBranch ? (
                    <TouchableOpacity onPress={() => router.push('/branch-edit')}>
                      <Text className="text-sm font-medium text-red-700">新建党支部</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View className="rounded-3xl border border-red-100 bg-white p-4">
                  {loading ? (
                    <EmptyLine text="正在加载支部数据..." />
                  ) : featuredBranches.length === 0 ? (
                    <EmptyLine text="暂无党支部数据，请先创建党支部。" />
                  ) : (
                    featuredBranches.map((branch, index) => (
                      <TouchableOpacity
                        key={branch.id}
                        onPress={() => router.push('/branch-detail', { id: branch.id })}
                        className={`flex-row items-center justify-between py-3 ${
                          index < featuredBranches.length - 1 ? 'border-b border-red-100' : ''
                        }`}
                      >
                        <View className="flex-1">
                          <Text className="font-medium text-slate-900">{branch.name}</Text>
                          <Text className="mt-1 text-sm text-slate-500">
                            书记：{branch.secretary_name || '未设置'} · 党员 {branch.member_count || 0} 名
                          </Text>
                        </View>
                        <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    ))
                  )}
                  <TouchableOpacity
                    onPress={() => router.push('/branches')}
                    className="mt-4 rounded-2xl border border-red-200 bg-red-50 py-3"
                  >
                    <Text className="text-center font-medium text-red-700">进入党支部管理</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View className="mt-6">
              <Text className="mb-3 text-lg font-bold text-red-700">建设中的模块</Text>
              <View className="grid grid-cols-2 gap-3">
                {PLANNED_FEATURES.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(item.route)}
                    className="rounded-3xl border border-dashed border-red-200 bg-white p-4"
                  >
                    <FontAwesome6 name={item.icon as any} size={20} color="#DC2626" />
                    <Text className="mt-3 font-semibold text-slate-900">{item.name}</Text>
                    <Text className="mt-2 text-xs leading-5 text-slate-500">
                      当前保留现状，点击可查看建设中说明。
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mt-6 rounded-3xl border border-red-100 bg-white p-5">
              <Text className="text-lg font-bold text-red-700">系统说明</Text>
              <Text className="mt-3 text-sm leading-6 text-slate-600">
                1. 党支部新增仅党建纪检部可见，保存后直接写入数据库。
              </Text>
              <Text className="text-sm leading-6 text-slate-600">
                2. 党员新增支持所属支部选择，保存后会同步生成普通党员账号。
              </Text>
              <Text className="text-sm leading-6 text-slate-600">
                3. 支部书记/委员只能为本支部新增党员，无法跨支部操作。
              </Text>
              <Text className="text-sm leading-6 text-slate-600">
                4. 党委领导和普通党员不显示创建入口，后端接口也会进行拦截。
              </Text>
              <Text className="mt-3 text-sm text-slate-500">
                已配置书记的支部：{stats.branchWithSecretaryCount} / {stats.branchCount}
              </Text>
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

function EmptyLine({ text }: { text: string }) {
  return (
    <View className="rounded-2xl bg-red-50 px-4 py-4">
      <Text className="text-sm text-slate-500">{text}</Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="rounded-3xl border border-red-100 bg-white p-4">
      <FontAwesome6 name={icon} size={18} color={color} />
      <Text className="mt-3 text-2xl font-bold text-slate-900">{value}</Text>
      <Text className="mt-1 text-xs text-slate-500">{label}</Text>
    </View>
  );
}
