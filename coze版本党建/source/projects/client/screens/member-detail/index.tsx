import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function MemberDetail() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemberDetail();
  }, [id]);

  const loadMemberDetail = async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/members/${id}`, {
        headers: { 'x-user-id': '1' },
      });
      const data = await response.json();
      setMember(data);
    } catch (error) {
      console.error('Load member detail error:', error);
    } finally {
      setLoading(false);
    }
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

  if (!member) {
    return (
      <Screen>
        <View className="flex-1 bg-gray-900 items-center justify-center">
          <FontAwesome6 name="user-slash" size={60} color="#374151" />
          <Text className="text-gray-500 mt-4">党员信息不存在</Text>
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
            <Text className="text-white font-bold text-lg">党员详情</Text>
            <TouchableOpacity>
              <FontAwesome6 name="ellipsis-vertical" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1">
          {/* 基本信息 */}
          <View className="px-4 py-4">
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <View className="flex-row items-center space-x-4 mb-4">
                <View className="w-16 h-16 rounded-full bg-red-900 items-center justify-center">
                  <FontAwesome6 name="user" size={32} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-xl">{member.name}</Text>
                  <Text className="text-gray-400 text-sm mt-1">{member.department}</Text>
                  <Text className="text-gray-500 text-xs mt-1">{member.position}</Text>
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
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <Text className="text-white font-bold text-lg mb-4">详细信息</Text>

              <View className="space-y-4">
                <DetailRow label="性别" value={member.gender || '-'} />
                <DetailRow label="出生日期" value={member.birthday || '-'} />
                <DetailRow label="身份证号" value="**********" />
                <DetailRow label="联系电话" value={member.phone || '-'} />
                <DetailRow label="邮箱" value={member.email || '-'} />
              </View>
            </View>

            {/* 党籍信息 */}
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <Text className="text-white font-bold text-lg mb-4">党籍信息</Text>

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
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
                <Text className="text-white font-bold text-lg mb-4">备注</Text>
                <Text className="text-gray-400">{member.remarks}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 底部操作栏 */}
        <View className="bg-gray-800 border-t border-gray-700 px-4 py-3">
          <TouchableOpacity
            onPress={() => router.push('/member-edit', { id })}
            className="bg-red-900 py-3 rounded-lg"
          >
            <Text className="text-white text-center font-medium">编辑信息</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-gray-400 w-28">{label}</Text>
      <Text className="text-gray-200 flex-1">{value}</Text>
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
      <Text className="text-gray-400 w-28">{label}</Text>
      <Text className="flex-1" style={{ color: statusColor }}>
        {value}
      </Text>
    </View>
  );
}
