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
import { getApiMessage, getApiUrl, requestJson } from '@/utils/api';

export default function BranchEdit() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();
  const isEdit = !!id;

  const [branch, setBranch] = useState({
    name: '',
    code: '',
    description: '',
    establish_date: '',
    renewal_reminder_date: '',
    secretary_name: '',
    status: 'active',
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRenewalDatePicker, setShowRenewalDatePicker] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadBranchDetail();
    }
  }, [id]);

  const loadBranchDetail = async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const { data } = await requestJson<any>(`/api/v1/branches/${id}`);
      setBranch({
        name: data.name || '',
        code: data.code || '',
        description: data.description || '',
        establish_date: data.establish_date || '',
        renewal_reminder_date: data.renewal_reminder_date || '',
        secretary_name: data.secretary_name || '',
        status: data.status || 'active',
      });
    } catch (error) {
      console.error('Load branch error:', error);
      Alert.alert('错误', '加载支部信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!branch.name) {
      Alert.alert('提示', '请输入支部名称');
      return;
    }

    if (!branch.code) {
      Alert.alert('提示', '请输入支部代码');
      return;
    }

    try {
      setLoading(true);
      const url = isEdit
        ? getApiUrl(`/api/v1/branches/${id}`)
        : getApiUrl('/api/v1/branches');

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(branch),
      });

      if (response.ok) {
        Alert.alert('成功', isEdit ? '更新成功' : '创建成功', [
          {
            text: '确定',
            onPress: () => router.back(),
          },
        ]);
      } else {
        const payload = await response.json().catch(() => null);
        Alert.alert('错误', getApiMessage(payload, '保存失败'));
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
              {isEdit ? '编辑党支部' : '新建党支部'}
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
                  label="支部名称 *"
                  value={branch.name}
                  onChangeText={(text) => setBranch({ ...branch, name: text })}
                  placeholder="请输入支部名称"
                />

                <FormItem
                  label="支部代码 *"
                  value={branch.code}
                  onChangeText={(text) => setBranch({ ...branch, code: text })}
                  placeholder="请输入支部代码"
                />

                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="border border-gray-600 rounded-lg px-4 py-3"
                >
                  <Text className="text-gray-400 text-sm mb-1">成立日期</Text>
                  <Text className={branch.establish_date ? 'text-white' : 'text-gray-500'}>
                    {branch.establish_date || '请选择日期'}
                  </Text>
                  <FontAwesome6 name="calendar" size={14} color="#DC2626" style={{ position: 'absolute', right: 12, top: 40 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowRenewalDatePicker(true)}
                  className="border border-gray-600 rounded-lg px-4 py-3"
                >
                  <Text className="text-gray-400 text-sm mb-1">换届提醒日期</Text>
                  <Text className={branch.renewal_reminder_date ? 'text-white' : 'text-gray-500'}>
                    {branch.renewal_reminder_date || '请选择日期'}
                  </Text>
                  <FontAwesome6 name="calendar-days" size={14} color="#DC2626" style={{ position: 'absolute', right: 12, top: 40 }} />
                </TouchableOpacity>

                <FormItem
                  label="支部书记"
                  value={branch.secretary_name}
                  onChangeText={(text) => setBranch({ ...branch, secretary_name: text })}
                  placeholder="请输入支部书记姓名"
                />
              </View>
            </View>

            {/* 描述信息 */}
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <Text className="text-white font-bold text-lg mb-4">描述信息</Text>
              <TextInput
                className="bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 h-24"
                placeholder="请输入支部描述"
                placeholderTextColor="#6B7280"
                value={branch.description}
                onChangeText={(text) => setBranch({ ...branch, description: text })}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* 状态信息 */}
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <Text className="text-white font-bold text-lg mb-4">状态</Text>
              <View className="grid grid-cols-2 gap-3">
                {[
                  { value: 'active', label: '正常' },
                  { value: 'inactive', label: '停用' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setBranch({ ...branch, status: item.value })}
                    className={`py-3 rounded-lg border ${
                      branch.status === item.value
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-gray-700 bg-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-center ${
                        branch.status === item.value ? 'text-red-500' : 'text-gray-300'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 日期选择器 */}
        {showDatePicker && (
          <DateTimePicker
            value={parseDate(branch.establish_date)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setBranch({ ...branch, establish_date: formatDate(date) });
              }
            }}
          />
        )}

        {showRenewalDatePicker && (
          <DateTimePicker
            value={parseDate(branch.renewal_reminder_date)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowRenewalDatePicker(false);
              if (date) {
                setBranch({ ...branch, renewal_reminder_date: formatDate(date) });
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
