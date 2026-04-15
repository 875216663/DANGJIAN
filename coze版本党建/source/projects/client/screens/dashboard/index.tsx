import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

const PLANNED_FEATURES = [
  { id: 'meetings', name: '三会一课', icon: 'calendar-check', color: '#F59E0B', route: '/meetings' },
  { id: 'study', name: '学习教育', icon: 'book-open', color: '#8B5CF6', route: '/study' },
  { id: 'supervision', name: '纪检监督', icon: 'shield-halved', color: '#EC4899', route: '/supervision' },
  { id: 'admin', name: '系统管理', icon: 'gear', color: '#6B7280', route: '/admin' },
];

export default function Dashboard() {
  const router = useSafeRouter();
  const { user, users, switchUser, storageMode, backendBaseUrl } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, branchesRes] = await Promise.all([
        fetch(`${BACKEND_BASE_URL}/api/v1/members?page=1&limit=100`, {
          headers: { 'x-user-id': '1' },
        }),
        fetch(`${BACKEND_BASE_URL}/api/v1/branches`, {
          headers: { 'x-user-id': '1' },
        }),
      ]);

      const membersData = await membersRes.json();
      const branchesData = await branchesRes.json();

      setMembers(membersData.data || []);
      setBranches(branchesData || []);
    } catch (error) {
      console.error('Load dashboard data error:', error);
      setMembers([]);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const stats = useMemo(() => {
    const probationaryCount = members.filter((item) => item.status === 'probationary').length;
    const activeCount = members.filter((item) => item.status === 'active').length;
    const branchWithSecretaryCount = branches.filter((item) => item.secretary_name).length;

    return {
      memberCount: members.length,
      branchCount: branches.length,
      probationaryCount,
      activeCount,
      branchWithSecretaryCount,
    };
  }, [branches, members]);

  const featuredMembers = members.slice(0, 4);
  const featuredBranches = branches.slice(0, 4);

  return (
    <Screen>
      <View className="flex-1 bg-gray-950">
        <View className="bg-red-900 px-4 pb-5 pt-12">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <FontAwesome6 name="flag" size={20} color="white" />
              </View>
              <View>
                <Text className="text-lg font-bold text-white">中英智慧党务</Text>
                <Text className="text-xs text-red-100">真实数据版工作台</Text>
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
            activeOpacity={0.88}
            className="mt-5 rounded-3xl bg-white/12 px-4 py-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm text-red-100">当前演示账号</Text>
                <Text className="mt-1 text-xl font-bold text-white">{user?.name || '未识别账号'}</Text>
                <Text className="mt-1 text-sm text-red-100">
                  {user?.role_label || '未知角色'} {user?.branch_name ? `· ${user.branch_name}` : '· 全局视角'}
                </Text>
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
            <View className="rounded-3xl border border-gray-800 bg-gray-900 p-5">
              <Text className="text-lg font-bold text-white">当前交付范围</Text>
              <Text className="mt-2 text-sm leading-6 text-gray-400">
                当前正式版本优先聚焦“党员信息管理”和“党支部信息管理”。这两个模块支持真实数据库保存，适合直接投入日常信息维护使用。
              </Text>
              <View className="mt-5 flex-row">
                <TouchableOpacity
                  onPress={() => router.push('/members')}
                  className="mr-3 flex-1 rounded-2xl bg-red-900 px-4 py-4"
                >
                  <FontAwesome6 name="users" size={20} color="white" />
                  <Text className="mt-3 font-semibold text-white">党员管理</Text>
                  <Text className="mt-1 text-xs leading-5 text-red-100">查询、新增、编辑、导入导出党员信息</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/branches')}
                  className="flex-1 rounded-2xl border border-gray-700 bg-gray-800 px-4 py-4"
                >
                  <FontAwesome6 name="building-columns" size={20} color="#F87171" />
                  <Text className="mt-3 font-semibold text-white">党支部管理</Text>
                  <Text className="mt-1 text-xs leading-5 text-gray-400">查看组织结构、书记信息与支部详情</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-6">
              <Text className="mb-3 text-lg font-bold text-white">数据概览</Text>
              <View className="grid grid-cols-2 gap-3">
                <StatCard icon="users" color="#EF4444" label="党员总数" value={stats.memberCount} />
                <StatCard icon="building-columns" color="#10B981" label="支部总数" value={stats.branchCount} />
                <StatCard icon="user-check" color="#3B82F6" label="正式党员" value={stats.activeCount} />
                <StatCard icon="user-clock" color="#F59E0B" label="预备党员" value={stats.probationaryCount} />
              </View>
            </View>

            <View className="mt-6">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-white">党员信息管理</Text>
                <TouchableOpacity onPress={() => router.push('/member-edit')}>
                  <Text className="text-sm text-red-400">新增党员</Text>
                </TouchableOpacity>
              </View>
              <View className="rounded-3xl border border-gray-800 bg-gray-900 p-4">
                {loading ? (
                  <EmptyLine text="正在加载党员数据..." />
                ) : featuredMembers.length === 0 ? (
                  <EmptyLine text="暂无党员数据，建议先新增或导入党员信息。" />
                ) : (
                  featuredMembers.map((member, index) => (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => router.push('/member-detail', { id: member.id })}
                      className={`flex-row items-center justify-between py-3 ${
                        index < featuredMembers.length - 1 ? 'border-b border-gray-800' : ''
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-white">{member.name}</Text>
                        <Text className="mt-1 text-sm text-gray-400">
                          {member.department || '未设置部门'} · {member.branch_name || '未分配支部'}
                        </Text>
                      </View>
                      <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
                    </TouchableOpacity>
                  ))
                )}
                <TouchableOpacity
                  onPress={() => router.push('/members')}
                  className="mt-4 rounded-2xl border border-gray-700 bg-gray-800 py-3"
                >
                  <Text className="text-center font-medium text-white">进入党员管理</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-6">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-white">党支部信息管理</Text>
                <TouchableOpacity onPress={() => router.push('/branch-edit')}>
                  <Text className="text-sm text-red-400">新增支部</Text>
                </TouchableOpacity>
              </View>
              <View className="rounded-3xl border border-gray-800 bg-gray-900 p-4">
                {loading ? (
                  <EmptyLine text="正在加载支部数据..." />
                ) : featuredBranches.length === 0 ? (
                  <EmptyLine text="暂无支部数据，建议先创建党支部。" />
                ) : (
                  featuredBranches.map((branch, index) => (
                    <TouchableOpacity
                      key={branch.id}
                      onPress={() => router.push('/branch-detail', { id: branch.id })}
                      className={`flex-row items-center justify-between py-3 ${
                        index < featuredBranches.length - 1 ? 'border-b border-gray-800' : ''
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-white">{branch.name}</Text>
                        <Text className="mt-1 text-sm text-gray-400">
                          书记：{branch.secretary_name || '未设置'} · 党员 {branch.member_count || 0} 名
                        </Text>
                      </View>
                      <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
                    </TouchableOpacity>
                  ))
                )}
                <TouchableOpacity
                  onPress={() => router.push('/branches')}
                  className="mt-4 rounded-2xl border border-gray-700 bg-gray-800 py-3"
                >
                  <Text className="text-center font-medium text-white">进入党支部管理</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-6">
              <Text className="mb-3 text-lg font-bold text-white">建设规划</Text>
              <View className="grid grid-cols-2 gap-3">
                {PLANNED_FEATURES.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(item.route)}
                    className="rounded-3xl border border-dashed border-gray-700 bg-gray-900 p-4"
                  >
                    <FontAwesome6 name={item.icon as any} size={20} color={item.color} />
                    <Text className="mt-3 font-semibold text-white">{item.name}</Text>
                    <Text className="mt-2 text-xs leading-5 text-gray-400">正在建设中，点击查看规划说明。</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mt-6 rounded-3xl border border-gray-800 bg-gray-900 p-5">
              <Text className="text-lg font-bold text-white">使用建议</Text>
              <Text className="mt-3 text-sm leading-6 text-gray-400">
                1. 先在“党支部管理”中维护组织信息和书记信息。
              </Text>
              <Text className="text-sm leading-6 text-gray-400">
                2. 再通过“党员管理”逐步录入、导入和维护党员档案。
              </Text>
              <Text className="text-sm leading-6 text-gray-400">
                3. 如需演示不同角色效果，可点击顶部“当前演示账号”切换身份。
              </Text>
              <Text className="text-sm leading-6 text-gray-400">
                4. 当前版本所有有效修改都会优先保存到数据库。
              </Text>
              <Text className="mt-3 text-sm text-gray-500">
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
        <View className="flex-1 justify-end bg-black/60">
          <View className="rounded-t-3xl bg-gray-900 px-4 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">切换演示账号</Text>
              <TouchableOpacity onPress={() => setSwitcherVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="white" />
              </TouchableOpacity>
            </View>
            {users.map((candidate) => (
              <TouchableOpacity
                key={candidate.id}
                onPress={async () => {
                  await switchUser(candidate.id);
                  setSwitcherVisible(false);
                }}
                className={`mb-3 rounded-2xl border px-4 py-4 ${
                  candidate.id === user?.id
                    ? 'border-red-500 bg-red-950/40'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-semibold text-white">{candidate.name}</Text>
                    <Text className="mt-1 text-sm text-gray-400">
                      {candidate.role_label} {candidate.branch_name ? `· ${candidate.branch_name}` : '· 全局视角'}
                    </Text>
                  </View>
                  {candidate.id === user?.id && (
                    <FontAwesome6 name="circle-check" size={18} color="#F87171" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
}: {
  icon: string;
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View className="rounded-3xl border border-gray-800 bg-gray-900 p-4">
      <FontAwesome6 name={icon as any} size={20} color={color} />
      <Text className="mt-3 text-2xl font-bold text-white">{value}</Text>
      <Text className="mt-1 text-sm text-gray-400">{label}</Text>
    </View>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <View className="py-6">
      <Text className="text-sm leading-6 text-gray-500">{text}</Text>
    </View>
  );
}
