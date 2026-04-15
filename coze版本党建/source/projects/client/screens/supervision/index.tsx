import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function Supervision() {
  const router = useSafeRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [meetingStats, setMeetingStats] = useState({
    total_count: 0,
    completed_count: 0,
    ongoing_count: 0,
    planned_count: 0,
    year_count: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [alertsRes, statsRes] = await Promise.all([
          fetch(`${BACKEND_BASE_URL}/api/v1/dashboard/alerts`, {
            headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
          }),
          fetch(`${BACKEND_BASE_URL}/api/v1/meetings/stats/summary`, {
            headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
          }),
        ]);

        const alertsData = await alertsRes.json();
        const statsData = await statsRes.json();

        setAlerts(alertsData || []);
        setMeetingStats(statsData);
      } catch (error) {
        console.error('Load supervision data error:', error);
      }
    };

    loadData();
  }, []);

  const alertSummary = useMemo(
    () => ({
      critical: alerts.filter((item) => item.alert_level === 'critical').length,
      warning: alerts.filter((item) => item.alert_level === 'warning').length,
      handled: alerts.filter((item) => item.is_handled).length,
    }),
    [alerts]
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
            <Text className="text-white font-bold text-lg">纪检监督</Text>
            <View className="w-6" />
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
            <Text className="text-white font-bold text-lg mb-2">纪检监督</Text>
            <Text className="text-gray-400 text-sm">
              页面已接入风险预警与会议执行数据，可用于日常监督、提醒和整改跟踪。
            </Text>
          </View>

          <Text className="text-white font-bold text-lg mb-3">风险概览</Text>
          <View className="grid grid-cols-2 gap-3 mb-4">
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <FontAwesome6 name="triangle-exclamation" size={22} color="#EF4444" />
              <Text className="text-white font-bold text-2xl mt-3">{alertSummary.critical}</Text>
              <Text className="text-gray-400 text-sm mt-1">高风险预警</Text>
            </View>
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <FontAwesome6 name="bell" size={22} color="#F59E0B" />
              <Text className="text-white font-bold text-2xl mt-3">{alertSummary.warning}</Text>
              <Text className="text-gray-400 text-sm mt-1">一般提醒</Text>
            </View>
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <FontAwesome6 name="calendar-check" size={22} color="#10B981" />
              <Text className="text-white font-bold text-2xl mt-3">{meetingStats.completed_count}</Text>
              <Text className="text-gray-400 text-sm mt-1">已完成会议</Text>
            </View>
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <FontAwesome6 name="clock" size={22} color="#3B82F6" />
              <Text className="text-white font-bold text-2xl mt-3">
                {meetingStats.planned_count + meetingStats.ongoing_count}
              </Text>
              <Text className="text-gray-400 text-sm mt-1">待跟进会议</Text>
            </View>
          </View>

          <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
            <Text className="text-white font-bold text-lg mb-3">监督重点</Text>
            <View className="gap-3">
              <TouchableOpacity
                onPress={() => router.push('/members')}
                className="bg-gray-700 rounded-lg p-3 flex-row items-center justify-between"
              >
                <View>
                  <Text className="text-white font-medium">党员党费与转正跟踪</Text>
                  <Text className="text-gray-400 text-sm mt-1">快速查看党员明细并处理提醒</Text>
                </View>
                <FontAwesome6 name="chevron-right" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/meetings')}
                className="bg-gray-700 rounded-lg p-3 flex-row items-center justify-between"
              >
                <View>
                  <Text className="text-white font-medium">组织生活执行情况</Text>
                  <Text className="text-gray-400 text-sm mt-1">查看计划中、进行中的三会一课任务</Text>
                </View>
                <FontAwesome6 name="chevron-right" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <Text className="text-white font-bold text-lg mb-3">预警清单</Text>
            {alerts.length === 0 ? (
              <Text className="text-gray-500">暂无预警</Text>
            ) : (
              alerts.slice(0, 6).map((item) => (
                <View key={item.id} className="py-3 border-b border-gray-700">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-medium">{item.alert_type}</Text>
                    <Text
                      className={`text-xs ${
                        item.alert_level === 'critical' ? 'text-red-400' : 'text-yellow-400'
                      }`}
                    >
                      {item.alert_level === 'critical' ? '高风险' : '提醒'}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-sm mt-1">{item.description}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}
