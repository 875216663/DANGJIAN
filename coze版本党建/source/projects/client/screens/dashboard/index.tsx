import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

// API Base URL
const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

// 导航菜单项
const menuItems = [
  { id: 'members', name: '党员管理', icon: 'users' },
  { id: 'branches', name: '党支部管理', icon: 'building-columns' },
  { id: 'meetings', name: '三会一课', icon: 'calendar-check' },
  { id: 'study', name: '学习教育', icon: 'book-open' },
  { id: 'supervision', name: '纪检监督', icon: 'shield-halved' },
  { id: 'admin', name: '系统管理', icon: 'gear' },
];

export default function Dashboard() {
  const router = useSafeRouter();
  const { user, users, switchUser, storageMode, backendBaseUrl } = useAuth();
  const [activeMenu, setActiveMenu] = useState('members');
  const [refreshing, setRefreshing] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);

  // 看板数据
  const [dashboardData, setDashboardData] = useState({
    memberCount: 0,
    branchCount: 0,
    feeCompletionRate: 0,
    meetingCompletionRate: 0,
    probationaryWarningCount: 0,
    studyCompletionRate: 0,
  });

  // 待办任务
  const [todos, setTodos] = useState<any[]>([]);
  // 预警信息
  const [alerts, setAlerts] = useState<any[]>([]);
  // 通知公告
  const [notices, setNotices] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const dashRes = await fetch(`${BACKEND_BASE_URL}/api/v1/dashboard/dashboard`, {
        headers: { 'x-user-id': '1' },
      });
      const dashData = await dashRes.json();
      setDashboardData(dashData);

      const todoRes = await fetch(`${BACKEND_BASE_URL}/api/v1/dashboard/todos`, {
        headers: { 'x-user-id': '1' },
      });
      const todoData = await todoRes.json();
      setTodos(todoData);

      const alertRes = await fetch(`${BACKEND_BASE_URL}/api/v1/dashboard/alerts`, {
        headers: { 'x-user-id': '1' },
      });
      const alertData = await alertRes.json();
      setAlerts(alertData);

      const noticeRes = await fetch(`${BACKEND_BASE_URL}/api/v1/notices?page=1&limit=5`, {
        headers: { 'x-user-id': '1' },
      });
      const noticeData = await noticeRes.json();
      setNotices(noticeData.data || []);
    } catch (error) {
      console.error('Load data error:', error);
    }
  }, [BACKEND_BASE_URL]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    (async () => {
      try {
        await loadDashboardData();
      } catch (error) {
        console.error('Load data error:', error);
      } finally {
        setRefreshing(false);
      }
    })();
  }, [loadDashboardData]);

  // 快捷入口
  const quickActions = [
    { id: 'import', name: '党员导入', icon: 'file-import', color: '#3B82F6' },
    { id: 'branch', name: '支部管理', icon: 'building-columns', color: '#10B981' },
    { id: 'meetings', name: '三会一课', icon: 'calendar-check', color: '#DC2626' },
    { id: 'approval', name: '审批', icon: 'check-double', color: '#F59E0B' },
    { id: 'export', name: '报表导出', icon: 'file-export', color: '#8B5CF6' },
    { id: 'profile', name: '我的信息', icon: 'user', color: '#EF4444' },
    { id: 'learning', name: '学习中心', icon: 'book-open', color: '#EC4899' },
  ];

  return (
    <Screen>
      <View className="flex-1 bg-gray-900">
        {/* 顶部栏 */}
        <View className="bg-red-900 px-4 pt-12 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center overflow-hidden">
                <FontAwesome6 name="flag" size={20} color="white" />
              </View>
              <View>
                <Text className="text-white font-bold text-lg">中英人寿智慧党务</Text>
                <Text className="text-red-200 text-xs">智慧党建系统</Text>
              </View>
            </View>
            <View className="flex-row items-center space-x-3">
              <TouchableOpacity className="relative">
                <FontAwesome6 name="bell" size={22} color="white" />
                {todos.length > 0 && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center">
                    <Text className="text-white text-xs font-bold">{todos.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View className="flex-row items-center space-x-2">
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center overflow-hidden">
                  <FontAwesome6 name="user" size={16} color="white" />
                </View>
              </View>
            </View>
          </View>

          {/* 用户信息 */}
          <TouchableOpacity
            onPress={() => setSwitcherVisible(true)}
            className="mt-4 bg-white/10 rounded-lg p-3"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-3">
                <Text className="text-white font-medium">{user?.name || '未登录用户'}</Text>
                <Text className="text-red-200 text-sm">|</Text>
                <Text className="text-red-200 text-sm">{user?.branch_name || '全局视角'}</Text>
                <Text className="text-red-200 text-sm">|</Text>
                <Text className="text-red-200 text-sm">{user?.role_label || '未知角色'}</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="mr-2 text-xs text-red-100">
                  {storageMode === 'database' ? 'Neon 数据库' : '本地文件模式'}
                </Text>
                <FontAwesome6 name="chevron-down" size={12} color="#FECACA" />
              </View>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-xs text-red-100">当前后端：{backendBaseUrl}</Text>
              <Text className="text-xs text-red-100">点击切换操作者</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
          }
        >
          {/* 数据看板 */}
          <View className="px-4 py-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-bold text-lg">数据看板</Text>
            </View>

            <View className="grid grid-cols-2 gap-3">
              {/* 党员总数 */}
              <TouchableOpacity
                onPress={() => router.push('/members')}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700"
              >
                <View className="flex-row items-center space-x-2 mb-2">
                  <FontAwesome6 name="users" size={20} color="#DC2626" />
                  <Text className="text-gray-400 text-sm">党员总数</Text>
                </View>
                <Text className="text-white text-2xl font-bold">{dashboardData.memberCount}</Text>
              </TouchableOpacity>

              {/* 支部总数 */}
              <TouchableOpacity
                onPress={() => router.push('/branches')}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700"
              >
                <View className="flex-row items-center space-x-2 mb-2">
                  <FontAwesome6 name="building-columns" size={20} color="#10B981" />
                  <Text className="text-gray-400 text-sm">支部总数</Text>
                </View>
                <Text className="text-white text-2xl font-bold">{dashboardData.branchCount}</Text>
              </TouchableOpacity>

              {/* 党费完成率 */}
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <View className="flex-row items-center space-x-2 mb-2">
                  <FontAwesome6 name="coins" size={20} color="#F59E0B" />
                  <Text className="text-gray-400 text-sm">党费完成率</Text>
                </View>
                <Text className="text-white text-2xl font-bold">{dashboardData.feeCompletionRate}%</Text>
              </View>

              {/* 组织生活达标率 */}
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <View className="flex-row items-center space-x-2 mb-2">
                  <FontAwesome6 name="calendar-check" size={20} color="#8B5CF6" />
                  <Text className="text-gray-400 text-sm">组织生活达标率</Text>
                </View>
                <Text className="text-white text-2xl font-bold">{dashboardData.meetingCompletionRate}%</Text>
              </View>

              {/* 转正预警 */}
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <View className="flex-row items-center space-x-2 mb-2">
                  <FontAwesome6 name="triangle-exclamation" size={20} color="#EF4444" />
                  <Text className="text-gray-400 text-sm">转正预警</Text>
                </View>
                <Text className="text-white text-2xl font-bold">{dashboardData.probationaryWarningCount}</Text>
              </View>

              {/* 学习完成率 */}
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <View className="flex-row items-center space-x-2 mb-2">
                  <FontAwesome6 name="book-open" size={20} color="#EC4899" />
                  <Text className="text-gray-400 text-sm">学习完成率</Text>
                </View>
                <Text className="text-white text-2xl font-bold">{dashboardData.studyCompletionRate}%</Text>
              </View>
            </View>
          </View>

          {/* 快捷入口 */}
          <View className="px-4 py-2">
            <Text className="text-white font-bold text-lg mb-3">快捷入口</Text>
            <View className="grid grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  className="items-center"
                  onPress={() => {
                    if (action.id === 'import' || action.id === 'export' || action.id === 'approval') {
                      router.push('/members');
                    }
                    if (action.id === 'branch') router.push('/branches');
                    if (action.id === 'meetings') router.push('/meetings');
                    if (action.id === 'profile') router.push('/member-detail', { id: 1 });
                    if (action.id === 'learning') router.push('/study');
                  }}
                >
                  <View className="w-14 h-14 rounded-xl bg-gray-800 items-center justify-center border border-gray-700 mb-2">
                    <FontAwesome6 name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text className="text-gray-300 text-xs text-center">{action.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 待办任务 */}
          {todos.length > 0 && (
            <View className="px-4 py-2">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-bold text-lg">待办任务</Text>
                <TouchableOpacity onPress={() => router.push('/meetings')}>
                  <Text className="text-red-500 text-sm">查看全部</Text>
                </TouchableOpacity>
              </View>
              <View className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {todos.slice(0, 3).map((todo, index) => {
                  // 根据待办类型设置图标和颜色
                  let iconName: any = 'check-circle';
                  let iconColor = '#F59E0B';
                  
                  if (todo.type === 'approval') {
                    iconName = 'check-circle';
                    iconColor = '#F59E0B';
                  } else if (todo.type === 'study') {
                    iconName = 'book';
                    iconColor = '#8B5CF6';
                  } else if (todo.type === 'fee') {
                    iconName = 'coins';
                    iconColor = '#10B981';
                  } else if (todo.type === 'meeting') {
                    if (todo.meeting_type === '支部大会') {
                      iconName = 'users';
                      iconColor = '#DC2626';
                    } else if (todo.meeting_type === '支部委员会') {
                      iconName = 'user-group';
                      iconColor = '#10B981';
                    } else if (todo.meeting_type === '党课') {
                      iconName = 'chalkboard-user';
                      iconColor = '#F59E0B';
                    }
                  }

                  // 处理点击事件
                  const handlePress = () => {
                    if (todo.type === 'meeting' && todo.route) {
                      // 三会一课待办，跳转到会议表单页
                      if (todo.params && todo.params.id) {
                        router.push(todo.route, todo.params);
                      } else {
                        // 如果没有id，可能是新建会议，跳转到三会一课列表
                        router.push('/meetings');
                      }
                    } else if (todo.type === 'approval' && todo.route) {
                      // 审批待办
                      if (todo.params && todo.params.id) {
                        router.push(todo.route, todo.params);
                      }
                    }
                  };

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={handlePress}
                      className={`flex-row items-center justify-between p-4 ${index < todos.length - 1 ? 'border-b border-gray-700' : ''}`}
                    >
                      <View className="flex-row items-center space-x-3 flex-1">
                        <FontAwesome6
                          name={iconName}
                          size={20}
                          color={iconColor}
                        />
                        <View className="flex-1">
                          <Text className="text-white font-medium">{todo.title}</Text>
                          <Text className="text-gray-400 text-sm">{todo.description}</Text>
                        </View>
                      </View>
                      <FontAwesome6 name="chevron-right" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 预警信息 */}
          {alerts.length > 0 && (
            <View className="px-4 py-2">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-bold text-lg">预警信息</Text>
                <TouchableOpacity>
                  <Text className="text-red-500 text-sm">查看全部</Text>
                </TouchableOpacity>
              </View>
              <View className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {alerts.slice(0, 3).map((alert, index) => (
                  <View
                    key={alert.id}
                    className={`flex-row items-center justify-between p-4 ${index < alerts.length - 1 ? 'border-b border-gray-700' : ''}`}
                  >
                    <View className="flex-row items-center space-x-3 flex-1">
                      <FontAwesome6
                        name="triangle-exclamation"
                        size={20}
                        color={alert.alert_level === 'critical' ? '#EF4444' : '#F59E0B'}
                      />
                      <View className="flex-1">
                        <Text className="text-white font-medium">{alert.alert_type}</Text>
                        <Text className="text-gray-400 text-sm">{alert.description}</Text>
                      </View>
                    </View>
                    <TouchableOpacity className="bg-red-900 px-3 py-1 rounded-lg">
                      <Text className="text-white text-xs font-medium">查看</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 通知公告 */}
          <View className="px-4 py-2 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-bold text-lg">通知公告</Text>
              <TouchableOpacity>
                <Text className="text-red-500 text-sm">查看全部</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {notices.map((notice, index) => (
                <View
                  key={notice.id}
                  className={`flex-row items-center justify-between p-4 ${index < notices.length - 1 ? 'border-b border-gray-700' : ''}`}
                >
                  <View className="flex-row items-center space-x-3 flex-1">
                    {!notice.is_read && (
                      <View className="w-2 h-2 rounded-full bg-red-500" />
                    )}
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${notice.is_read ? 'text-gray-400' : 'text-white'}`}
                      >
                        {notice.title}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {notice.notice_type} • {new Date(notice.publish_date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <FontAwesome6 name="chevron-right" size={16} color="#6B7280" />
                </View>
              ))}
              {notices.length === 0 && (
                <View className="p-8 items-center">
                  <FontAwesome6 name="bell" size={40} color="#374151" />
                  <Text className="text-gray-500 mt-2">暂无通知公告</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* 底部导航 */}
        <View className="bg-gray-800 border-t border-gray-700 px-2 py-2">
          <View className="flex-row justify-around">
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                className="items-center py-2 px-3"
                onPress={() => {
                  setActiveMenu(item.id);
                  if (item.id === 'members') router.push('/members');
                  if (item.id === 'branches') router.push('/branches');
                  if (item.id === 'meetings') router.push('/meetings');
                  if (item.id === 'study') router.push('/study');
                  if (item.id === 'supervision') router.push('/supervision');
                  if (item.id === 'admin') router.push('/admin');
                }}
              >
                <FontAwesome6
                  name={item.icon as any}
                  size={20}
                  color={activeMenu === item.id ? '#DC2626' : '#6B7280'}
                />
                <Text
                  className={`text-xs mt-1 ${activeMenu === item.id ? 'text-red-500' : 'text-gray-500'}`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
              <Text className="text-lg font-bold text-white">切换当前操作者</Text>
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
                      {candidate.role_label} {candidate.branch_name ? `· ${candidate.branch_name}` : '· 全局'}
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
