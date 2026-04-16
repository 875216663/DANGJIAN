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
import { canEditMember } from '@/utils/rbac';

export default function MemberDetail() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const { id } = useSafeSearchParams<{ id: string }>();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const canManage = canEditMember(user);

  useFocusEffect(
    React.useCallback(() => {
      loadMemberDetail();
    }, [id])
  );

  const loadMemberDetail = async () => {
    if (!id) {
      setMember(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await requestJson<any>(`/api/v1/members/${id}`);
      setMember(data);
    } catch (error) {
      console.error('Load member detail error:', error);
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!id) {
      return;
    }

    Alert.alert('确认删除', `确定删除党员“${member?.name || ''}”吗？删除后不可恢复。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(getApiUrl(`/api/v1/members/${id}`), {
              method: 'DELETE',
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
              Alert.alert('删除失败', getApiMessage(payload, '删除党员失败'));
              return;
            }

            Alert.alert('删除成功', '党员信息已删除', [
              {
                text: '确定',
                onPress: () => router.replace('/members'),
              },
            ]);
          } catch (error) {
            console.error('Delete member error:', error);
            Alert.alert('删除失败', '网络异常，请稍后再试');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 bg-red-50 items-center justify-center">
          <FontAwesome6 name="spinner" size={40} color="#DC2626" />
        </View>
      </Screen>
    );
  }

  if (!member) {
    return (
      <Screen>
        <View className="flex-1 bg-red-50 items-center justify-center">
          <FontAwesome6 name="user-slash" size={60} color="#374151" />
          <Text className="text-gray-500 mt-4">党员信息不存在</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 bg-red-50">
        {/* 顶部栏 */}
        <View className="bg-red-900 px-4 pt-12 pb-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">党员详情</Text>
            <TouchableOpacity>
              <FontAwesome6 name="ellipsis-vertical" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1">
          {/* 基本信息 */}
          <View className="px-4 py-4">
            <View className="bg-white rounded-xl p-4 border border-red-100 mb-4">
              <View className="flex-row items-center space-x-4 mb-4">
                <View className="w-16 h-16 rounded-full bg-red-900 items-center justify-center">
                  <FontAwesome6 name="user" size={32} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-bold text-xl">{member.name}</Text>
                  <Text className="text-slate-500 text-sm mt-1">{member.department}</Text>
                  <Text className="text-slate-400 text-xs mt-1">{member.position}</Text>
                </View>
              </View>

              <View className="flex-row space-x-2 mb-3">
                <View
                  className="px-3 py-1 rounded-lg"
                  style={{ backgroundColor: '#10B981' + '20' }}
                >
                  <Text className="text-green-500 text-sm font-medium">{member.political_status}</Text>
                </View>
                <View
                  className="px-3 py-1 rounded-lg"
                  style={{ backgroundColor: '#F59E0B' + '20' }}
                >
                  <Text className="text-yellow-500 text-sm font-medium">
                    {member.status === 'active' ? '正常' : member.status}
                  </Text>
                </View>
              </View>
            </View>

            {/* 详细信息 */}
            <View className="bg-white rounded-xl p-4 border border-red-100 mb-4">
              <Text className="text-red-700 font-bold text-lg mb-4">详细信息</Text>

                <View className="space-y-4">
                  <DetailRow label="性别" value={member.gender || '-'} />
                  <DetailRow label="出生日期" value={member.birthday || '-'} />
                  <DetailRow label="联系电话" value={member.phone || '-'} />
                  <DetailRow label="邮箱" value={member.email || '-'} />
                </View>
            </View>

            {/* 党籍信息 */}
            <View className="bg-white rounded-xl p-4 border border-red-100 mb-4">
              <Text className="text-red-700 font-bold text-lg mb-4">党籍信息</Text>

              <View className="space-y-4">
                <DetailRow label="入党日期" value={member.join_date || '-'} />
                <DetailRow label="转正日期" value={member.regular_date || '-'} />
                <DetailRow label="所属支部" value={member.branch_name} />
                <DetailRowWithStatus
                  label="党费缴纳年月"
                  value={member.last_fee_month || '未缴纳'}
                  status={member.last_fee_month}
                />
              </View>
            </View>

            {/* 备注信息 */}
            {member.remarks && (
              <View className="bg-white rounded-xl p-4 border border-red-100 mb-4">
                <Text className="text-red-700 font-bold text-lg mb-4">备注</Text>
                <Text className="text-slate-500">{member.remarks}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 底部操作栏 */}
        {canManage && (
          <View className="bg-white border-t border-red-100 px-4 py-3 flex-row">
            <TouchableOpacity
              onPress={() => router.push('/member-edit', { id })}
              className="mr-3 flex-1 rounded-lg bg-red-900 py-3"
            >
              <Text className="text-white text-center font-medium">编辑信息</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-1 rounded-lg border border-red-500 bg-red-950/40 py-3"
            >
              <Text className="text-center font-medium text-red-300">删除党员</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-slate-500 w-28">{label}</Text>
      <Text className="text-slate-700 flex-1">{value}</Text>
    </View>
  );
}

function DetailRowWithStatus({ label, value, status }: { label: string; value: string; status?: string }) {
  // 判断是否为当前月或上月
  const isRecent = status && (() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;

    const [feeYear, feeMonth] = status.split('-').map(Number);

    return (
      (feeYear === currentYear && feeMonth === currentMonth) ||
      (feeYear === lastYear && feeMonth === lastMonth)
    );
  })();

  const statusColor = isRecent ? '#10B981' : status ? '#F59E0B' : '#EF4444';

  return (
    <View className="flex-row justify-between">
      <Text className="text-slate-500 w-28">{label}</Text>
      <Text className="flex-1" style={{ color: statusColor }}>
        {value}
      </Text>
    </View>
  );
}
