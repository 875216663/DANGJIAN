import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function MeetingDetail() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetingDetail();
  }, [id]);

  const loadMeetingDetail = async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/meetings/${id}`, {
        headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
      });
      const data = await response.json();
      setMeeting(data);
    } catch (error) {
      console.error('Load meeting detail error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push('/meeting-form', { id });
  };

  const handleDelete = async () => {
    Alert.alert('确认删除', '确定要删除这条会议记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${BACKEND_BASE_URL}/api/v1/meetings/${id}`, {
              method: 'DELETE',
              headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
            });

            if (response.ok) {
              Alert.alert('成功', '删除成功');
              router.back();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'planned':
        return '#F59E0B';
      case 'ongoing':
        return '#3B82F6';
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
      default:
        return status;
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

  if (!meeting) {
    return (
      <Screen>
        <View className="flex-1 bg-gray-900 items-center justify-center">
          <FontAwesome6 name="calendar-xmark" size={60} color="#374151" />
          <Text className="text-gray-500 mt-4">会议记录不存在</Text>
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
            <Text className="text-white font-bold text-lg">会议详情</Text>
            <TouchableOpacity onPress={handleEdit}>
              <FontAwesome6 name="pen" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1">
          <View className="px-4 py-4">
            {/* 基本信息 */}
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center space-x-2">
                  <FontAwesome6
                    name={
                      meeting.meeting_type === '支部大会'
                        ? 'users'
                        : meeting.meeting_type === '党课'
                        ? 'chalkboard-user'
                        : 'user-group'
                    }
                    size={20}
                    color="#DC2626"
                  />
                  <Text className="text-gray-400 text-sm">{meeting.meeting_type}</Text>
                </View>
                <View
                  className="px-3 py-1 rounded-lg"
                  style={{ backgroundColor: getStatusColor(meeting.status) + '20' }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: getStatusColor(meeting.status) }}
                  >
                    {getStatusText(meeting.status)}
                  </Text>
                </View>
              </View>

              <Text className="text-white font-bold text-xl mb-3">{meeting.title}</Text>

              <View className="flex-row items-center space-x-4 mb-2">
                <View className="flex-row items-center space-x-2">
                  <FontAwesome6 name="calendar" size={16} color="#6B7280" />
                  <Text className="text-gray-400 text-sm">
                    {meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString() : '-'}
                  </Text>
                </View>
                <View className="flex-row items-center space-x-2">
                  <FontAwesome6 name="location-dot" size={16} color="#6B7280" />
                  <Text className="text-gray-400 text-sm">{meeting.location || '-'}</Text>
                </View>
              </View>

              <Text className="text-gray-500 text-xs mt-2">
                {meeting.branch_name || '-'} • 创建者: {meeting.creator_name || '-'}
              </Text>
            </View>

            {/* 根据类型显示特定信息 */}
            {meeting.meeting_type === '支部大会' && (
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
                <Text className="text-white font-bold text-lg mb-3">会议类别</Text>
                <View className="flex-row flex-wrap">
                  {(meeting.meeting_categories || []).map((category: string, index: number) => (
                    <View
                      key={index}
                      className="mr-2 mb-2 px-3 py-1 rounded-lg bg-red-900/20 border border-red-500"
                    >
                      <Text className="text-red-500 text-sm">{category}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {meeting.moderator && (
              <DetailRow label="主持人" value={meeting.moderator} />
            )}

            {meeting.meeting_type === '党课' && (
              <>
                {meeting.lecturer && (
                  <DetailRow label="授课人" value={meeting.lecturer} />
                )}
                {meeting.lecturer_title && (
                  <DetailRow label="授课人身份" value={meeting.lecturer_title} />
                )}
                {meeting.subject && (
                  <DetailRow label="党课主题" value={meeting.subject} />
                )}
              </>
            )}

            {/* 参会人员 */}
            {meeting.attendees && meeting.attendees.length > 0 && (
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-bold text-lg">参会人员</Text>
                  <Text className="text-green-500 text-sm">
                    {meeting.attendees.length} 人
                  </Text>
                </View>
                {meeting.attendees.map((attendee: any, index: number) => (
                  <Text key={index} className="text-gray-300 text-sm mb-1">
                    {attendee.name}
                  </Text>
                ))}
              </View>
            )}

            {/* 缺席人员 */}
            {meeting.absentees && meeting.absentees.length > 0 && (
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-bold text-lg">缺席人员</Text>
                  <Text className="text-yellow-500 text-sm">
                    {meeting.absentees.length} 人
                  </Text>
                </View>
                {meeting.absentees.map((absentee: any, index: number) => (
                  <View key={index} className="flex-row justify-between mb-1">
                    <Text className="text-gray-300 text-sm">{absentee.name}</Text>
                    {absentee.reason && (
                      <Text className="text-gray-500 text-sm">({absentee.reason})</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* 会议议题 */}
            {meeting.topics && (
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
                <Text className="text-white font-bold text-lg mb-3">会议议题</Text>
                <Text className="text-gray-300">{meeting.topics}</Text>
              </View>
            )}

            {/* 会议内容 */}
            {meeting.meeting_details && (
              <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
                <Text className="text-white font-bold text-lg mb-3">
                  {meeting.meeting_type === '党课' ? '党课内容' : '会议内容'}
                </Text>
                <Text className="text-gray-300 whitespace-pre-wrap">{meeting.meeting_details}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 底部操作栏 */}
        <View className="bg-gray-800 border-t border-gray-700 px-4 py-3">
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={handleEdit}
              className="flex-1 bg-red-900 py-3 rounded-lg"
            >
              <Text className="text-white text-center font-medium">编辑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-1 bg-gray-700 py-3 rounded-lg"
            >
              <Text className="text-white text-center font-medium">删除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4 flex-row justify-between">
      <Text className="text-gray-400 w-28">{label}</Text>
      <Text className="text-white flex-1">{value}</Text>
    </View>
  );
}
