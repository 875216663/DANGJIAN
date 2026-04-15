import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function BranchActivists() {
  const router = useSafeRouter();
  const { id, branchName } = useSafeSearchParams<{ id: string; branchName: string }>();

  const [activists, setActivists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivists = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/branches/${id}/activists`, {
        headers: { 'x-user-id': '1' },
      });
      const data = await response.json();
      setActivists(data);
    } catch (error) {
      console.error('Load activists error:', error);
      Alert.alert('错误', '加载积极分子列表失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadActivists();
    }, [id])
  );

  const handleAdd = () => {
    router.push('/activist-edit', { id, branchName });
  };

  const handleEdit = (activistId: number) => {
    router.push('/activist-edit', { id, activistId: String(activistId), branchName });
  };

  const handleDelete = (activistId: number, name: string) => {
    Alert.alert('确认删除', `确定要删除"${name}"吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${BACKEND_BASE_URL}/api/v1/branches/${id}/activists/${activistId}`, {
              method: 'DELETE',
              headers: { 'x-user-id': '1' },
            });

            if (response.ok) {
              Alert.alert('成功', '删除成功');
              loadActivists();
            } else {
              const error = await response.json();
              Alert.alert('错误', error.error || '删除失败');
            }
          } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <View className="flex-1 bg-gray-900">
        {/* 顶部栏 */}
        <View className="bg-red-900 px-4 pt-12 pb-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <FontAwesome6 name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{branchName}</Text>
              <Text className="text-red-200 text-xs">入党积极分子</Text>
            </View>
            <TouchableOpacity onPress={handleAdd}>
              <FontAwesome6 name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-4 py-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadActivists(); }} tintColor="#DC2626" />
          }
        >
          {loading ? (
            <View className="items-center justify-center py-20">
              <Text className="text-gray-400">加载中...</Text>
            </View>
          ) : activists.length === 0 ? (
            <View className="items-center justify-center py-20">
              <FontAwesome6 name="users-slash" size={48} color="#4B5563" />
              <Text className="text-gray-400 mt-4">暂无入党积极分子</Text>
              <TouchableOpacity
                onPress={handleAdd}
                className="mt-4 bg-red-900 px-6 py-2 rounded-full"
              >
                <Text className="text-white font-bold">新增积极分子</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activists.map((activist) => (
              <View
                key={activist.id}
                className="bg-gray-800 rounded-xl p-4 mb-3 border border-gray-700"
              >
                {/* 头部：姓名 + 操作按钮 */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">{activist.name}</Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      {activist.gender} · {activist.nation} · {activist.education}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => handleEdit(activist.id)}>
                      <FontAwesome6 name="pen-to-square" size={18} color="#DC2626" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(activist.id, activist.name)}>
                      <FontAwesome6 name="trash-can" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 底部：日期信息 */}
                <View className="border-t border-gray-700 pt-3">
                  <View className="flex-row items-center mb-2">
                    <FontAwesome6 name="file-lines" size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-xs ml-2">
                      提交入党申请书：{activist.application_date}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <FontAwesome6 name="comments" size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-xs ml-2">
                      谈话时间：{activist.talk_date}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}
