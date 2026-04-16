import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { requestJson } from '@/utils/api';
import { canCreateBranch } from '@/utils/rbac';

export default function Branches() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await requestJson<any[]>('/api/v1/branches');
      setBranches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load branches error:', error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBranches();
    }, [loadBranches])
  );

  const filteredBranches = branches.filter((branch) =>
    [branch.name, branch.code, branch.secretary_name, branch.contact_phone]
      .join(' ')
      .toLowerCase()
      .includes(searchKeyword.trim().toLowerCase())
  );

  return (
    <Screen>
      <View className="flex-1 bg-red-50">
        <View className="bg-red-700 px-4 pb-4 pt-12">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={20} color="white" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">党支部管理</Text>
            {canCreateBranch(user) ? (
              <TouchableOpacity onPress={() => router.push('/branch-edit')}>
                <FontAwesome6 name="plus" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <View className="w-5" />
            )}
          </View>
          <Text className="mt-3 text-xs text-red-100">
            {canCreateBranch(user)
              ? '党建纪检部可创建和维护党支部，保存后会直接落库。'
              : '当前角色为查看型视角，不显示新建党支部入口。'}
          </Text>
        </View>

        <View className="px-4 py-4">
          <View className="rounded-2xl border border-red-100 bg-white px-3 py-3">
            <View className="flex-row items-center">
              <FontAwesome6 name="magnifying-glass" size={16} color="#94A3B8" />
              <TextInput
                className="ml-2 flex-1 text-slate-900"
                placeholder="搜索支部名称、代码、书记或联系电话"
                placeholderTextColor="#94A3B8"
                value={searchKeyword}
                onChangeText={setSearchKeyword}
              />
            </View>
          </View>

          <View className="mt-4 rounded-2xl border border-red-100 bg-white px-4 py-3">
            <Text className="text-sm text-slate-500">当前列表共 {filteredBranches.length} 个党支部</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pb-6">
          {loading ? (
            <EmptyState icon="spinner" title="正在加载支部数据..." />
          ) : filteredBranches.length === 0 ? (
            <EmptyState icon="building-columns" title="暂无匹配的党支部数据" />
          ) : (
            filteredBranches.map((branch) => (
              <TouchableOpacity
                key={branch.id}
                className="mb-3 rounded-3xl border border-red-100 bg-white p-4"
                onPress={() => router.push('/branch-detail', { id: branch.id })}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-red-50">
                        <FontAwesome6 name="building-columns" size={16} color="#DC2626" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-slate-900">{branch.name}</Text>
                        <Text className="mt-1 text-xs text-slate-500">支部代码：{branch.code}</Text>
                      </View>
                    </View>
                    <View className="mt-4 flex-row flex-wrap">
                      <Badge label={`书记：${branch.secretary_name || '未设置'}`} />
                      <Badge label={`党员 ${branch.member_count || 0} 名`} />
                      {branch.contact_phone ? <Badge label={`联系电话 ${branch.contact_phone}`} /> : null}
                    </View>
                    <Text className="mt-3 text-sm leading-6 text-slate-500">
                      {branch.remark || branch.description || '暂无支部说明'}
                    </Text>
                  </View>
                  <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View className="mr-2 mt-2 rounded-full border border-red-100 bg-red-50 px-3 py-1">
      <Text className="text-xs text-red-700">{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title }: { icon: any; title: string }) {
  return (
    <View className="items-center rounded-3xl border border-red-100 bg-white px-4 py-16">
      <FontAwesome6 name={icon} size={40} color="#F87171" />
      <Text className="mt-4 text-sm text-slate-500">{title}</Text>
    </View>
  );
}
