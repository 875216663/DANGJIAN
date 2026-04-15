import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

// 会议类型配置
const MEETING_TYPES = {
  支部大会: { icon: 'users', color: '#DC2626' },
  支部委员会: { icon: 'user-group', color: '#10B981' },
  党课: { icon: 'chalkboard-user', color: '#F59E0B' },
};

export default function Meetings() {
  const router = useSafeRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        ...(selectedType && { meeting_type: selectedType }),
      });

      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/meetings?${params}`, {
        headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
      });

      const data = await response.json();
      setMeetings(data.data || []);
    } catch (error) {
      console.error('Load meetings error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'planned':
        return '#F59E0B';
      case 'ongoing':
        return '#3B82F6';
      case 'cancelled':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'planned':
        return '计划中';
      case 'ongoing':
        return '进行中';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  const getMeetingTypeConfig = (type: string) => {
    return MEETING_TYPES[type as keyof typeof MEETING_TYPES] || {
      icon: 'calendar',
      color: '#6B7280',
    };
  };

  return (
    <Screen>
      <View className="flex-1 bg-gray-900">
        {/* 顶部栏 */}
        <View className="bg-red-900 px-4 pt-12 pb-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">三会一课</Text>
            <TouchableOpacity onPress={() => router.push('/meeting-form')}>
              <FontAwesome6 name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 类型筛选 */}
        <View className="px-4 py-3 bg-gray-800">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => setSelectedType('')}
              className={`mr-3 px-4 py-2 rounded-lg ${!selectedType ? 'bg-red-900' : 'bg-gray-700'}`}
            >
              <Text className={`text-sm ${!selectedType ? 'text-white' : 'text-gray-300'}`}>
                全部
              </Text>
            </TouchableOpacity>
            {Object.keys(MEETING_TYPES).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedType(type)}
                className={`mr-3 px-4 py-2 rounded-lg ${selectedType === type ? 'bg-red-900' : 'bg-gray-700'}`}
              >
                <Text className={`text-sm ${selectedType === type ? 'text-white' : 'text-gray-300'}`}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 统计信息 */}
        <View className="px-4 py-2">
          <Text className="text-gray-400 text-sm">
            共 {meetings.length} 条记录
            {selectedType && `（${selectedType}）`}
          </Text>
        </View>

        {/* 列表 */}
        <ScrollView className="flex-1 px-4 py-2">
          {loading ? (
            <View className="py-20 items-center">
              <FontAwesome6 name="spinner" size={40} color="#DC2626" />
              <Text className="text-gray-500 mt-2">加载中...</Text>
            </View>
          ) : meetings.length === 0 ? (
            <View className="py-20 items-center">
              <FontAwesome6 name="calendar-xmark" size={60} color="#374151" />
              <Text className="text-gray-500 mt-4">暂无会议记录</Text>
              <TouchableOpacity
                onPress={() => router.push('/meeting-form')}
                className="mt-4 bg-red-900 px-6 py-2 rounded-lg"
              >
                <Text className="text-white">创建会议记录</Text>
              </TouchableOpacity>
            </View>
          ) : (
            meetings.map((meeting) => {
              const typeConfig = getMeetingTypeConfig(meeting.meeting_type);
              return (
                <TouchableOpacity
                  key={meeting.id}
                  className="bg-gray-800 rounded-xl p-4 mb-3 border border-gray-700"
                  onPress={() => router.push('/meeting-detail', { id: meeting.id })}
                >
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                      <View className="flex-row items-center space-x-2 mb-1">
                        <FontAwesome6
                          name={typeConfig.icon as any}
                          size={16}
                          color={typeConfig.color}
                        />
                        <Text className="text-gray-400 text-sm">{meeting.meeting_type}</Text>
                        <View
                          className="px-2 py-0.5 rounded"
                          style={{ backgroundColor: getStatusColor(meeting.status) + '20' }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: getStatusColor(meeting.status) }}
                          >
                            {getStatusText(meeting.status)}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-white font-bold text-base">{meeting.title}</Text>
                    </View>
                    <FontAwesome6 name="chevron-right" size={16} color="#6B7280" />
                  </View>

                  <View className="flex-row items-center space-x-4 mb-2">
                    <View className="flex-row items-center space-x-1">
                      <FontAwesome6 name="calendar" size={14} color="#6B7280" />
                      <Text className="text-gray-400 text-xs">
                        {meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString() : '-'}
                      </Text>
                    </View>
                    <View className="flex-row items-center space-x-1">
                      <FontAwesome6 name="location-dot" size={14} color="#6B7280" />
                      <Text className="text-gray-400 text-xs" numberOfLines={1}>
                        {meeting.location || '-'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between pt-2 border-t border-gray-700">
                    <View className="flex-row items-center space-x-2">
                      <FontAwesome6 name="users" size={14} color="#10B981" />
                      <Text className="text-gray-400 text-xs">参会 {meeting.attendee_count || 0} 人</Text>
                    </View>
                    <Text className="text-gray-500 text-xs">
                      {meeting.branch_name || '-'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}
