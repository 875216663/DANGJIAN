import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function Admin() {
  const router = useSafeRouter();
  const { user, storageMode, backendBaseUrl } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [studyFiles, setStudyFiles] = useState<any[]>([]);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('offline');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [membersRes, branchesRes, meetingsRes, noticesRes, studyRes, healthRes] = await Promise.all([
          fetch(`${BACKEND_BASE_URL}/api/v1/members?page=1&limit=100`, {
            headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
          }),
          fetch(`${BACKEND_BASE_URL}/api/v1/branches`, {
            headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
          }),
          fetch(`${BACKEND_BASE_URL}/api/v1/meetings?page=1&limit=100`, {
            headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
          }),
          fetch(`${BACKEND_BASE_URL}/api/v1/notices?page=1&limit=20`, {
            headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
          }),
          fetch(`${BACKEND_BASE_URL}/api/v1/study/files`),
          fetch(`${BACKEND_BASE_URL}/api/v1/health`),
        ]);

        const membersData = await membersRes.json();
        const branchesData = await branchesRes.json();
        const meetingsData = await meetingsRes.json();
        const noticesData = await noticesRes.json();
        const studyData = await studyRes.json();
        const healthData = await healthRes.json();

        setMembers(membersData.data || []);
        setBranches(branchesData || []);
        setMeetings(meetingsData.data || []);
        setNotices(noticesData.data || []);
        setStudyFiles(studyData.files || []);
        setBackendStatus(healthData.status === 'ok' ? 'online' : 'offline');
      } catch (error) {
        console.error('Load admin data error:', error);
        setBackendStatus('offline');
      }
    };

    loadData();
  }, [BACKEND_BASE_URL, user?.id]);

  const overviewCards = useMemo(
    () => [
      { label: '党员档案', value: members.length, icon: 'users', color: '#3B82F6' },
      { label: '组织支部', value: branches.length, icon: 'building-columns', color: '#10B981' },
      {
        label: '待办会议',
        value: meetings.filter((item) => item.status !== 'completed').length,
        icon: 'calendar-days',
        color: '#F59E0B',
      },
      { label: '资料文件', value: studyFiles.length, icon: 'folder-open', color: '#EF4444' },
    ],
    [branches.length, meetings, members.length, studyFiles.length]
  );

  return (
    <Screen>
      <View className="flex-1 bg-gray-900">
        {/* 顶部栏 */}
        <View className="bg-red-900 px-4 pt-12 pb-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">系统管理</Text>
            <View className="w-6" />
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
            <Text className="text-white font-bold text-lg mb-2">系统管理</Text>
            <Text className="text-gray-400 text-sm">
              当前页面已接入真实业务数据，可用于查看组织规模、通知发布、会议执行和资料沉淀情况。
            </Text>
            <View className="mt-3 rounded-xl bg-gray-900/70 p-3">
              <Text className="text-sm text-gray-300">当前操作者：{user?.name || '未识别'}</Text>
              <Text className="mt-1 text-sm text-gray-300">角色：{user?.role_label || '未知'}</Text>
              <Text className="mt-1 text-sm text-gray-300">
                数据存储：{storageMode === 'database' ? 'Neon 数据库' : '本地文件模式'}
              </Text>
              <Text className="mt-1 text-sm text-gray-300">
                后端状态：{backendStatus === 'online' ? '在线' : '离线'}
              </Text>
              <Text className="mt-1 text-xs text-gray-500">{backendBaseUrl}</Text>
            </View>
          </View>

          <Text className="text-white font-bold text-lg mb-3">系统概览</Text>
          <View className="grid grid-cols-2 gap-3 mb-4">
            {overviewCards.map((card) => (
              <View
                key={card.label}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700"
              >
                <FontAwesome6 name={card.icon as any} size={22} color={card.color} />
                <Text className="text-white font-bold text-2xl mt-3">{card.value}</Text>
                <Text className="text-gray-400 text-sm mt-1">{card.label}</Text>
              </View>
            ))}
          </View>

          <Text className="text-white font-bold text-lg mb-3">管理入口</Text>
          <View className="grid grid-cols-2 gap-3">
            <TouchableOpacity
              onPress={() => router.push('/members')}
              className="bg-gray-800 rounded-xl p-4 border border-gray-700 items-center"
            >
              <FontAwesome6 name="users-gear" size={32} color="#3B82F6" />
              <Text className="text-white font-medium mt-2">党员档案</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/branches')}
              className="bg-gray-800 rounded-xl p-4 border border-gray-700 items-center"
            >
              <FontAwesome6 name="sitemap" size={32} color="#8B5CF6" />
              <Text className="text-white font-medium mt-2">组织架构</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/meetings')}
              className="bg-gray-800 rounded-xl p-4 border border-gray-700 items-center"
            >
              <FontAwesome6 name="calendar-check" size={32} color="#10B981" />
              <Text className="text-white font-medium mt-2">会议治理</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/study')}
              className="bg-gray-800 rounded-xl p-4 border border-gray-700 items-center"
            >
              <FontAwesome6 name="folder-tree" size={32} color="#F59E0B" />
              <Text className="text-white font-medium mt-2">资料中心</Text>
            </TouchableOpacity>
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 items-center">
              <FontAwesome6 name="clock-rotate-left" size={32} color="#EF4444" />
              <Text className="text-white font-medium mt-2">最近通知 {notices.length}</Text>
              <Text className="text-gray-500 text-xs mt-1">支持扩展为通知配置</Text>
            </View>
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 items-center">
              <FontAwesome6 name="bell" size={32} color="#EC4899" />
              <Text className="text-white font-medium mt-2">发布能力已打通</Text>
              <Text className="text-gray-500 text-xs mt-1">服务端支持通知增删查</Text>
            </View>
          </View>

          <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mt-4">
            <Text className="text-white font-bold text-lg mb-3">近期通知</Text>
            {notices.slice(0, 3).map((notice) => (
              <View key={notice.id} className="py-3 border-b border-gray-700">
                <Text className="text-white font-medium">{notice.title}</Text>
                <Text className="text-gray-400 text-sm mt-1" numberOfLines={2}>
                  {notice.content}
                </Text>
              </View>
            ))}
            {notices.length === 0 && (
              <Text className="text-gray-500">暂无通知</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}
