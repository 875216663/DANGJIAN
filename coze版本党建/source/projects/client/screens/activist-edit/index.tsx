import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function ActivistEdit() {
  const router = useSafeRouter();
  const { id, activistId, branchName } = useSafeSearchParams<{ id: string; activistId?: string; branchName: string }>();
  const isEdit = !!activistId;

  const [activist, setActivist] = useState({
    name: '',
    gender: '男',
    nation: '汉族',
    birthday: '',
    education: '',
    application_date: '',
    talk_date: '',
  });

  const [loading, setLoading] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showApplicationDatePicker, setShowApplicationDatePicker] = useState(false);
  const [showTalkDatePicker, setShowTalkDatePicker] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadActivistDetail();
    }
  }, [activistId]);

  const loadActivistDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/branches/${id}/activists`, {
        headers: { 'x-user-id': '1' },
      });
      const data = await response.json();
      const activistData = data.find((a: any) => a.id === parseInt(activistId!));
      if (activistData) {
        setActivist(activistData);
      }
    } catch (error) {
      console.error('Load activist error:', error);
      Alert.alert('错误', '加载积极分子信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activist.name) {
      Alert.alert('提示', '请输入姓名');
      return;
    }

    if (!activist.application_date) {
      Alert.alert('提示', '请选择提交入党申请书时间');
      return;
    }

    if (!activist.talk_date) {
      Alert.alert('提示', '请选择谈话时间');
      return;
    }

    try {
      setLoading(true);
      const url = isEdit
        ? `${BACKEND_BASE_URL}/api/v1/branches/${id}/activists/${activistId}`
        : `${BACKEND_BASE_URL}/api/v1/branches/${id}/activists`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify(activist),
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
        Alert.alert('错误', error.error || '保存失败');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('错误', '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]) || 1);
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
              {isEdit ? '编辑入党积极分子' : '新增入党积极分子'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text className="text-white font-bold">保存</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1">
          <View className="px-4 py-4">
            {/* 基本信息 */}
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <Text className="text-white font-bold text-lg mb-4">基本信息</Text>

              <View className="space-y-4">
                <FormItem
                  label="姓名 *"
                  value={activist.name}
                  onChangeText={(text) => setActivist({ ...activist, name: text })}
                  placeholder="请输入姓名"
                />

                <FormItem
                  label="性别"
                  value={activist.gender}
                  onChangeText={(text) => setActivist({ ...activist, gender: text })}
                  placeholder="请输入性别"
                />

                <FormItem
                  label="民族"
                  value={activist.nation}
                  onChangeText={(text) => setActivist({ ...activist, nation: text })}
                  placeholder="请输入民族"
                />

                <TouchableOpacity
                  onPress={() => setShowBirthdayPicker(true)}
                  className="border border-gray-600 rounded-lg px-4 py-3"
                >
                  <Text className="text-gray-400 text-sm mb-1">出生日期</Text>
                  <Text className={activist.birthday ? 'text-white' : 'text-gray-500'}>
                    {activist.birthday || '请选择日期'}
                  </Text>
                  <FontAwesome6 name="calendar" size={14} color="#DC2626" style={{ position: 'absolute', right: 12, top: 40 }} />
                </TouchableOpacity>

                <FormItem
                  label="学历"
                  value={activist.education}
                  onChangeText={(text) => setActivist({ ...activist, education: text })}
                  placeholder="请输入学历"
                />
              </View>
            </View>

            {/* 党务信息 */}
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <Text className="text-white font-bold text-lg mb-4">党务信息</Text>

              <View className="space-y-4">
                <TouchableOpacity
                  onPress={() => setShowApplicationDatePicker(true)}
                  className="border border-gray-600 rounded-lg px-4 py-3"
                >
                  <Text className="text-gray-400 text-sm mb-1">提交入党申请书时间 *</Text>
                  <Text className={activist.application_date ? 'text-white' : 'text-gray-500'}>
                    {activist.application_date || '请选择日期'}
                  </Text>
                  <FontAwesome6 name="calendar" size={14} color="#DC2626" style={{ position: 'absolute', right: 12, top: 40 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowTalkDatePicker(true)}
                  className="border border-gray-600 rounded-lg px-4 py-3"
                >
                  <Text className="text-gray-400 text-sm mb-1">支部派人与入党积极分子谈话时间 *</Text>
                  <Text className={activist.talk_date ? 'text-white' : 'text-gray-500'}>
                    {activist.talk_date || '请选择日期'}
                  </Text>
                  <FontAwesome6 name="calendar" size={14} color="#DC2626" style={{ position: 'absolute', right: 12, top: 40 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 出生日期选择器 */}
        {showBirthdayPicker && (
          <DateTimePicker
            value={parseDate(activist.birthday)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowBirthdayPicker(false);
              if (date) {
                setActivist({ ...activist, birthday: formatDate(date) });
              }
            }}
          />
        )}

        {/* 提交入党申请书时间选择器 */}
        {showApplicationDatePicker && (
          <DateTimePicker
            value={parseDate(activist.application_date)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowApplicationDatePicker(false);
              if (date) {
                setActivist({ ...activist, application_date: formatDate(date) });
              }
            }}
          />
        )}

        {/* 谈话时间选择器 */}
        {showTalkDatePicker && (
          <DateTimePicker
            value={parseDate(activist.talk_date)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowTalkDatePicker(false);
              if (date) {
                setActivist({ ...activist, talk_date: formatDate(date) });
              }
            }}
          />
        )}
      </View>
    </Screen>
  );
}

function FormItem({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View>
      <Text className="text-gray-400 text-sm mb-2">{label}</Text>
      <TextInput
        className="bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600"
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
