import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import DateTimePicker from '@react-native-community/datetimepicker';
import MemberSelector from '@/components/MemberSelector';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

// 会议类型
const MEETING_TYPES = ['支部大会', '支部委员会', '党课'];

// 支部大会会议类别
const BRANCH_MEETING_CATEGORIES = [
  '集中学习',
  '党日活动',
  '党课',
  '党员发展',
  '党内选举',
  '组织生活会',
  '其他',
];

interface Member {
  id: number;
  name: string;
  reason?: string;
}

export default function MeetingForm() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id?: string }>();
  const isEdit = !!id;

  // 表单状态
  const [meetingType, setMeetingType] = useState('支部大会');
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('planned');
  const [moderator, setModerator] = useState(''); // 主持人
  const [lecturer, setLecturer] = useState(''); // 授课人
  const [lecturerTitle, setLecturerTitle] = useState(''); // 授课人身份
  const [selectedAttendees, setSelectedAttendees] = useState<Member[]>([]); // 参会人员
  const [selectedAbsentees, setSelectedAbsentees] = useState<Member[]>([]); // 缺席人员
  const [meetingCategories, setMeetingCategories] = useState<string[]>([]); // 会议类别（支部大会专用）
  const [topics, setTopics] = useState(''); // 会议议题
  const [subject, setSubject] = useState(''); // 党课主题
  const [meetingDetails, setMeetingDetails] = useState(''); // 会议内容

  // 状态选择Modal
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 党员选择器Modal
  const [showAttendeeSelector, setShowAttendeeSelector] = useState(false);
  const [showAbsenteeSelector, setShowAbsenteeSelector] = useState(false);

  // 加载编辑数据
  useEffect(() => {
    if (isEdit) {
      fetch(`${BACKEND_BASE_URL}/api/v1/meetings/${id}`, {
        headers: { 'x-user-id': '1', 'x-user-role': 'party_committee' },
      })
        .then((res) => res.json())
        .then((data) => {
          setMeetingType(data.meeting_type || '支部大会');
          setTitle(data.title || '');
          setMeetingDate(data.meeting_date ? new Date(data.meeting_date) : new Date());
          setLocation(data.location || '');
          setStatus(data.status || 'planned');
          setModerator(data.moderator || '');
          setLecturer(data.lecturer || '');
          setLecturerTitle(data.lecturer_title || '');
          setSelectedAttendees(data.attendees || []);
          setSelectedAbsentees(data.absentees || []);
          setMeetingCategories(data.meeting_categories || []);
          setTopics(data.topics || '');
          setSubject(data.subject || '');
          setMeetingDetails(data.meeting_details || '');
        })
        .catch((error) => {
          console.error('Load meeting detail error:', error);
        });
    }
  }, [id, isEdit]);

  const toggleCategory = (category: string) => {
    setMeetingCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    // 基本校验
    if (!title) {
      Alert.alert('提示', '请输入会议标题');
      return;
    }
    if (!location) {
      Alert.alert('提示', '请输入会议地点');
      return;
    }

    // 将参会人员转换为后端需要的格式
    const attendeesArray = selectedAttendees.map(m => ({ name: m.name }));

    // 将缺席人员转换为后端需要的格式
    const absenteesArray = selectedAbsentees.map(m => ({
      name: m.name,
      reason: m.reason || '',
    }));

    const formData: any = {
      title,
      meeting_type: meetingType,
      meeting_date: meetingDate.toISOString().split('T')[0],
      location,
      status,
      moderator,
      attendees: attendeesArray,
      absentees: absenteesArray,
      meeting_details: meetingDetails,
    };

    // 根据会议类型添加特定字段
    if (meetingType === '支部大会') {
      formData.meeting_categories = meetingCategories;
      formData.topics = topics;
    } else if (meetingType === '支部委员会') {
      formData.topics = topics;
    } else if (meetingType === '党课') {
      formData.lecturer = lecturer;
      formData.lecturer_title = lecturerTitle;
      formData.subject = subject;
    }

    try {
      const url = isEdit
        ? `${BACKEND_BASE_URL}/api/v1/meetings/${id}`
        : `${BACKEND_BASE_URL}/api/v1/meetings`;

      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
          'x-user-role': 'party_committee',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert('成功', isEdit ? '更新成功' : '创建成功', [
          {
            text: '确定',
            onPress: () => router.back(),
          },
        ]);
      } else {
        const error = await response.json();
        Alert.alert('错误', error.error || '操作失败');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('错误', '操作失败');
    }
  };

  const renderFormFields = () => {
    switch (meetingType) {
      case '支部大会':
        return (
          <>
            <InputField
              label="主持人"
              value={moderator}
              onChangeText={setModerator}
              placeholder="请输入主持人姓名"
            />
            <View className="mb-4">
              <Text className="text-gray-400 text-sm mb-2">会议类别（可多选）</Text>
              <View className="flex-row flex-wrap">
                {BRANCH_MEETING_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => toggleCategory(category)}
                    className={`mr-2 mb-2 px-3 py-1.5 rounded-lg border ${
                      meetingCategories.includes(category)
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-gray-600 bg-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        meetingCategories.includes(category) ? 'text-red-500' : 'text-gray-300'
                      }`}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        );
      case '党课':
        return (
          <>
            <InputField
              label="授课人"
              value={lecturer}
              onChangeText={setLecturer}
              placeholder="请输入授课人姓名"
            />
            <InputField
              label="授课人身份"
              value={lecturerTitle}
              onChangeText={setLecturerTitle}
              placeholder="请输入授课人身份（如：党委书记等）"
            />
            <InputField
              label="党课主题"
              value={subject}
              onChangeText={setSubject}
              placeholder="请输入本次党课的核心主题"
            />
          </>
        );
      case '支部委员会':
        return (
          <InputField
            label="主持人"
            value={moderator}
            onChangeText={setModerator}
            placeholder="请输入主持人姓名"
          />
        );
      default:
        return null;
    }
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
            <Text className="text-white font-bold text-lg">
              {isEdit ? '编辑会议记录' : '创建会议记录'}
            </Text>
            <TouchableOpacity onPress={handleSubmit}>
              <FontAwesome6 name="check" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView className="flex-1 px-4 py-4">
            {/* 会议类型选择 */}
            <TouchableOpacity
              onPress={() => setShowTypeModal(true)}
              className="mb-4 bg-gray-800 rounded-xl p-4 border border-gray-700"
            >
              <Text className="text-gray-400 text-sm mb-2">会议类型 *</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-medium">{meetingType}</Text>
                <FontAwesome6 name="chevron-down" size={16} color="#6B7280" />
              </View>
            </TouchableOpacity>

            {/* 会议标题 */}
            <InputField
              label="会议标题 *"
              value={title}
              onChangeText={setTitle}
              placeholder="请输入会议标题"
              required
            />

            {/* 会议日期 */}
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="mb-4 bg-gray-800 rounded-xl p-4 border border-gray-700"
            >
              <Text className="text-gray-400 text-sm mb-2">会议日期 *</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-medium">
                  {meetingDate.toLocaleDateString()}
                </Text>
                <FontAwesome6 name="calendar" size={16} color="#6B7280" />
              </View>
            </TouchableOpacity>

            {/* 会议地点 */}
            <InputField
              label="会议地点 *"
              value={location}
              onChangeText={setLocation}
              placeholder="请输入会议地点"
              required
            />

            {/* 会议状态 */}
            <TouchableOpacity
              onPress={() => setShowStatusModal(true)}
              className="mb-4 bg-gray-800 rounded-xl p-4 border border-gray-700"
            >
              <Text className="text-gray-400 text-sm mb-2">会议状态</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-medium">
                  {status === 'planned' ? '计划中' : status === 'ongoing' ? '进行中' : '已完成'}
                </Text>
                <FontAwesome6 name="chevron-down" size={16} color="#6B7280" />
              </View>
            </TouchableOpacity>

            {/* 根据类型渲染特定字段 */}
            {renderFormFields()}

            {/* 参会人员 */}
            <TouchableOpacity
              onPress={() => setShowAttendeeSelector(true)}
              className="mb-4 bg-gray-800 rounded-xl p-4 border border-gray-700"
            >
              <Text className="text-gray-400 text-sm mb-2">参会人员</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-medium">
                  {selectedAttendees.length > 0
                    ? `${selectedAttendees.length} 人`
                    : '请选择参会人员'}
                </Text>
                <View className="flex-row items-center space-x-2">
                  {selectedAttendees.length > 0 && (
                    <Text className="text-gray-400 text-sm">
                      {selectedAttendees.map(m => m.name).join('、')}
                    </Text>
                  )}
                  <FontAwesome6 name="chevron-down" size={16} color="#6B7280" />
                </View>
              </View>
            </TouchableOpacity>

            {/* 缺席人员 */}
            <TouchableOpacity
              onPress={() => setShowAbsenteeSelector(true)}
              className="mb-4 bg-gray-800 rounded-xl p-4 border border-gray-700"
            >
              <Text className="text-gray-400 text-sm mb-2">缺席人员（可选）</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-medium">
                  {selectedAbsentees.length > 0
                    ? `${selectedAbsentees.length} 人`
                    : '请选择缺席人员'}
                </Text>
                <View className="flex-row items-center space-x-2">
                  {selectedAbsentees.length > 0 && (
                    <Text className="text-gray-400 text-sm">
                      {selectedAbsentees.map(m => m.name).join('、')}
                    </Text>
                  )}
                  <FontAwesome6 name="chevron-down" size={16} color="#6B7280" />
                </View>
              </View>
            </TouchableOpacity>

            {/* 会议议题/党课内容 */}
            {meetingType !== '党课' && (
              <TextAreaField
                label="会议议题"
                value={topics}
                onChangeText={setTopics}
                placeholder="请输入本次会议的核心议题，多个议题用换行分隔"
                numberOfLines={3}
              />
            )}

            {/* 会议内容 */}
            <TextAreaField
              label={meetingType === '党课' ? '党课内容' : '会议内容'}
              value={meetingDetails}
              onChangeText={setMeetingDetails}
              placeholder="请输入详细的会议内容、流程、发言要点等"
              numberOfLines={6}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* 会议类型选择Modal */}
        <Modal visible={showTypeModal} transparent animationType="slide">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowTypeModal(false)}
            className="flex-1 bg-black/50 justify-end"
          >
            <View className="bg-gray-800 rounded-t-3xl p-6">
              <Text className="text-white font-bold text-lg mb-4">选择会议类型</Text>
              {MEETING_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setMeetingType(type);
                    setShowTypeModal(false);
                  }}
                  className="py-4 border-b border-gray-700"
                >
                  <Text className={`text-base ${meetingType === type ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 会议状态选择Modal */}
        <Modal visible={showStatusModal} transparent animationType="slide">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowStatusModal(false)}
            className="flex-1 bg-black/50 justify-end"
          >
            <View className="bg-gray-800 rounded-t-3xl p-6">
              <Text className="text-white font-bold text-lg mb-4">选择会议状态</Text>
              {['planned', 'ongoing', 'completed'].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => {
                    setStatus(s);
                    setShowStatusModal(false);
                  }}
                  className="py-4 border-b border-gray-700"
                >
                  <Text className={`text-base ${status === s ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
                    {s === 'planned' ? '计划中' : s === 'ongoing' ? '进行中' : '已完成'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 日期选择器 */}
        {showDatePicker && (
          <DateTimePicker
            value={meetingDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setMeetingDate(selectedDate);
              }
            }}
          />
        )}

        {/* 党员选择器 - 参会人员 */}
        <MemberSelector
          visible={showAttendeeSelector}
          mode="attendees"
          selectedMembers={selectedAttendees}
          onClose={() => setShowAttendeeSelector(false)}
          onConfirm={setSelectedAttendees}
        />

        {/* 党员选择器 - 缺席人员 */}
        <MemberSelector
          visible={showAbsenteeSelector}
          mode="absentees"
          selectedMembers={selectedAbsentees}
          onClose={() => setShowAbsenteeSelector(false)}
          onConfirm={setSelectedAbsentees}
        />
      </View>
    </Screen>
  );
}

// 输入框组件
function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-gray-400 text-sm mb-2">
        {label}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>
      <TextInput
        className="bg-gray-800 rounded-xl p-4 text-white border border-gray-700"
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

// 多行文本框组件
function TextAreaField({
  label,
  value,
  onChangeText,
  placeholder,
  numberOfLines = 4,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  numberOfLines?: number;
}) {
  return (
    <View className="mb-4">
      <Text className="text-gray-400 text-sm mb-2">{label}</Text>
      <TextInput
        className="bg-gray-800 rounded-xl p-4 text-white border border-gray-700"
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        value={value}
        onChangeText={onChangeText}
        multiline
        numberOfLines={numberOfLines}
        textAlignVertical="top"
      />
    </View>
  );
}
