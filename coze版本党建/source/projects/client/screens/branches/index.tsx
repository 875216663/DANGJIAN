import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function Branches() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const canManage = user?.role !== 'member' && user?.role !== 'branch_member';

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/branches`, {
        headers: { 'x-user-id': '1' },
      });

      const data = await response.json();
      setBranches(data || []);
    } catch (error) {
      console.error('Load branches error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const filteredBranches = branches.filter((branch) =>
    [branch.name, branch.code, branch.secretary_name]
      .join(' ')
      .toLowerCase()
      .includes(searchKeyword.trim().toLowerCase())
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
            <Text className="text-white font-bold text-lg">党支部管理</Text>
            {canManage ? (
              <TouchableOpacity onPress={() => router.push('/branch-edit')}>
                <FontAwesome6 name="plus" size={24} color="white" />
              </TouchableOpacity>
            ) : (
              <View className="w-6" />
            )}
          </View>
        </View>

        <View className="bg-gray-800 px-4 py-3">
          <View className="flex-row items-center rounded-2xl bg-gray-700 px-3 py-3">
            <FontAwesome6 name="magnifying-glass" size={16} color="#9CA3AF" />
            <TextInput
              className="ml-2 flex-1 text-white"
              placeholder="搜索支部名称、代码、书记"
              placeholderTextColor="#6B7280"
              value={searchKeyword}
              onChangeText={setSearchKeyword}
            />
          </View>
        </View>

        {/* 统计信息 */}
        <View className="px-4 py-3">
          <View className="flex-row items-center space-x-2">
            <FontAwesome6 name="building-columns" size={20} color="#DC2626" />
            <Text className="text-gray-400 text-sm">共 {filteredBranches.length} 个支部</Text>
          </View>
        </View>

        {/* 列表 */}
        <ScrollView className="flex-1 px-4 py-2">
          {loading ? (
            <View className="py-20 items-center">
              <FontAwesome6 name="spinner" size={40} color="#DC2626" />
              <Text className="text-gray-500 mt-2">加载中...</Text>
            </View>
          ) : filteredBranches.length === 0 ? (
            <View className="py-20 items-center">
              <FontAwesome6 name="building" size={60} color="#374151" />
              <Text className="text-gray-500 mt-4">暂无匹配的支部数据</Text>
            </View>
          ) : (
            filteredBranches.map((branch) => (
              <TouchableOpacity
                key={branch.id}
                className="bg-gray-800 rounded-xl p-4 mb-3 border border-gray-700"
                onPress={() => router.push('/branch-detail', { id: branch.id })}
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center space-x-2">
                      <FontAwesome6 name="building-columns" size={18} color="#DC2626" />
                      <Text className="text-white font-bold text-lg">{branch.name}</Text>
                    </View>
                    <Text className="text-gray-500 text-sm mt-1">代码: {branch.code}</Text>
                  </View>
                  <FontAwesome6 name="chevron-right" size={16} color="#6B7280" />
                </View>

                <View className="flex-row space-x-3 mt-3 pt-3 border-t border-gray-700">
                  <View className="flex-1">
                    <View className="flex-row items-center space-x-2">
                      <FontAwesome6 name="users" size={14} color="#10B981" />
                      <Text className="text-green-500 font-bold text-xl">{branch.member_count}</Text>
                    </View>
                    <Text className="text-gray-500 text-xs mt-1">党员总数</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center space-x-2">
                      <FontAwesome6 name="user-clock" size={14} color="#F59E0B" />
                      <Text className="text-yellow-500 font-bold text-xl">{branch.probationary_count || 0}</Text>
                    </View>
                    <Text className="text-gray-500 text-xs mt-1">预备党员</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center space-x-2">
                      <FontAwesome6 name="user-tie" size={14} color="#EC4899" />
                      <Text className="text-pink-500 font-bold text-xl">{branch.secretary_name ? 1 : 0}</Text>
                    </View>
                    <Text className="text-gray-500 text-xs mt-1">书记配置</Text>
                  </View>
                </View>

                {/* 支部书记 */}
                <View className="mt-3 pt-3 border-t border-gray-700 flex-row items-center">
                  <FontAwesome6 name="user-tie" size={14} color="#DC2626" />
                  <Text className="text-gray-400 text-xs ml-2">支部书记</Text>
                  <Text className="text-gray-300 text-sm ml-2 flex-1">{branch.secretary_name || '未设置'}</Text>
                </View>

                {/* 支部委员 */}
                {branch.committee_members && branch.committee_members.length > 0 && (
                  <View className="mt-3 pt-3 border-t border-gray-700">
                    <Text className="text-gray-400 text-xs mb-2">支部委员</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {branch.committee_members.map((member: any, idx: number) => (
                        <View
                          key={idx}
                          className="bg-red-900/20 border border-red-900/50 rounded-lg px-2 py-1 flex-row items-center"
                        >
                          <FontAwesome6 name="award" size={10} color="#DC2626" />
                          <Text className="text-red-400 text-xs ml-1">{member.position}</Text>
                          <Text className="text-gray-300 text-xs ml-1">{member.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {branch.establish_date && (
                  <View className="mt-3 pt-3 border-t border-gray-700">
                    <Text className="text-gray-500 text-xs">
                      成立时间: {new Date(branch.establish_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}
