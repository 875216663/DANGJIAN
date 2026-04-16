import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { getApiMessage, getApiUrl, requestJson } from '@/utils/api';

export default function BranchDetail() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const { id } = useSafeSearchParams<{ id: string }>();
  const [branch, setBranch] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'members'>('info');
  const canManage = user?.role !== 'member' && user?.role !== 'branch_member';

  useFocusEffect(
    React.useCallback(() => {
      loadBranchDetail();
    }, [id])
  );

  const loadBranchDetail = async () => {
    if (!id) {
      setBranch(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [branchRes, membersRes] = await Promise.all([
        requestJson<any>(`/api/v1/branches/${id}`),
        requestJson<any[]>(`/api/v1/branches/${id}/members`),
      ]);

      setBranch(branchRes.data);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (error) {
      console.error('Load branch detail error:', error);
      setBranch(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!id) {
      return;
    }

    Alert.alert('确认删除', `确定删除支部“${branch?.name || ''}”吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(getApiUrl(`/api/v1/branches/${id}`), {
              method: 'DELETE',
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
              Alert.alert('删除失败', getApiMessage(payload, '删除支部失败'));
              return;
            }

            Alert.alert('删除成功', '支部信息已删除', [
              {
                text: '确定',
                onPress: () => router.replace('/branches'),
              },
            ]);
          } catch (error) {
            console.error('Delete branch error:', error);
            Alert.alert('删除失败', '网络异常，请稍后重试');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 bg-gray-900 items-center justify-center">
          <FontAwesome6 name="spinner" size={40} color="#DC2626" />
        </View>
      </Screen>
    );
  }

  if (!branch) {
    return (
      <Screen>
        <View className="flex-1 bg-gray-900 items-center justify-center">
          <FontAwesome6 name="building" size={60} color="#374151" />
          <Text className="text-gray-500 mt-4">支部信息不存在</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 bg-gray-900">
        {/* 顶部栏 */}
        <View className="bg-red-900 px-4 pt-12 pb-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">支部详情</Text>
            <TouchableOpacity>
              <FontAwesome6 name="ellipsis-vertical" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab切换 */}
        <View className="bg-gray-800 border-b border-gray-700">
          <View className="flex-row">
            <TouchableOpacity
              className={`flex-1 py-3 ${activeTab === 'info' ? 'border-b-2 border-red-500' : ''}`}
              onPress={() => setActiveTab('info')}
            >
              <Text
                className={`text-center font-medium ${activeTab === 'info' ? 'text-red-500' : 'text-gray-400'}`}
              >
                基本信息
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 ${activeTab === 'members' ? 'border-b-2 border-red-500' : ''}`}
              onPress={() => setActiveTab('members')}
            >
              <Text
                className={`text-center font-medium ${activeTab === 'members' ? 'text-red-500' : 'text-gray-400'}`}
              >
                党员列表 ({members.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1">
          {activeTab === 'info' ? (
            <View className="px-4 py-4">
              {/* 基本信息 */}
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
                <View className="flex-row items-center space-x-3 mb-4">
                  <View className="w-14 h-14 rounded-lg bg-red-900 items-center justify-center">
                    <FontAwesome6 name="building-columns" size={28} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-xl">{branch.name}</Text>
                    <Text className="text-gray-400 text-sm mt-1">代码: {branch.code}</Text>
                  </View>
                </View>

                <View className="flex-row space-x-2 mb-4">
                  <View
                    className="px-3 py-1 rounded-lg"
                    style={{ backgroundColor: '#10B981' + '20' }}
                  >
                    <Text className="text-green-500 text-sm font-medium">
                      {branch.status === 'active' ? '正常' : branch.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 统计数据 */}
              <View className="grid grid-cols-2 gap-3 mb-4">
                <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <FontAwesome6 name="users" size={24} color="#10B981" />
                  <Text className="text-white text-2xl font-bold mt-2">{branch.member_count}</Text>
                  <Text className="text-gray-400 text-xs mt-1">党员总数</Text>
                </View>
                <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <FontAwesome6 name="user-clock" size={24} color="#F59E0B" />
                  <Text className="text-white text-2xl font-bold mt-2">{branch.probationary_count || 0}</Text>
                  <Text className="text-gray-400 text-xs mt-1">预备党员</Text>
                </View>
              </View>

              {/* 详细信息 */}
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <Text className="text-white font-bold text-lg mb-4">详细信息</Text>

                <View className="space-y-4">
                  <DetailRow label="支部书记" value={branch.secretary_name || '未设置'} />
                  <DetailRow label="成立日期" value={branch.establish_date || '-'} />
                  <DetailRow label="换届提醒" value={branch.renewal_reminder_date || '-'} />
                  <DetailRow label="描述" value={branch.description || '-'} />
                </View>
              </View>
            </View>
          ) : (
            <View className="px-4 py-4">
              {members.length === 0 ? (
                <View className="py-20 items-center">
                  <FontAwesome6 name="users-slash" size={60} color="#374151" />
                  <Text className="text-gray-500 mt-4">暂无党员</Text>
                </View>
              ) : (
                members.map((member, index) => (
                  <TouchableOpacity
                    key={member.id}
                    className="bg-gray-800 rounded-xl p-4 mb-3 border border-gray-700"
                    onPress={() => router.push('/member-detail', { id: member.id })}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center space-x-2">
                          <Text className="text-white font-bold">{member.name}</Text>
                          <View className="px-2 py-0.5 rounded bg-green-900/30">
                            <Text className="text-green-500 text-xs">{member.political_status}</Text>
                          </View>
                        </View>
                        <Text className="text-gray-400 text-sm mt-1">{member.department}</Text>
                        <Text className="text-gray-500 text-xs">{member.position}</Text>
                      </View>
                      <FontAwesome6 name="chevron-right" size={16} color="#6B7280" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* 底部操作栏 */}
        {canManage && (
          <View className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex-row">
            <TouchableOpacity
              onPress={() => router.push('/branch-edit', { id })}
              className="mr-3 flex-1 rounded-lg bg-red-900 py-3"
            >
              <Text className="text-white text-center font-medium">编辑支部信息</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-1 rounded-lg border border-red-500 bg-red-950/40 py-3"
            >
              <Text className="text-center font-medium text-red-300">删除支部</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-gray-700">
      <Text className="text-gray-400 w-28">{label}</Text>
      <Text className="text-gray-200 flex-1">{value}</Text>
    </View>
  );
}
