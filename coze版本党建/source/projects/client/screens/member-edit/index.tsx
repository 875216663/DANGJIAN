import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function MemberEdit() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();
  const isEdit = !!id;

  const [member, setMember] = useState({
    name: '',
    gender: '男',
    birthday: '',
    department: '',
    position: '',
    phone: '',
    email: '',
    political_status: '中共党员',
    join_date: '',
    regular_date: '',
    branch_name: '第一党支部',
    last_fee_month: '',
    status: 'active',
    remarks: '',
  });

  const [loading, setLoading] = useState(false);
  const [showJoinDatePicker, setShowJoinDatePicker] = useState(false);
  const [showRegularDatePicker, setShowRegularDatePicker] = useState(false);
  const [showFeeMonthPicker, setShowFeeMonthPicker] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadMemberDetail();
    }
  }, [id]);

  const loadMemberDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/members/${id}`, {
        headers: { 'x-user-id': '1' },
      });
      const data = await response.json();
      setMember(data);
    } catch (error) {
      console.error('Load member error:', error);
      Alert.alert('错误', '加载党员信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!member.name) {
      Alert.alert('提示', '请输入姓名');
      return;
    }

    if (!member.join_date) {
      Alert.alert('提示', '请选择入党日期');
      return;
    }

    try {
      setLoading(true);
      const url = isEdit
        ? `${BACKEND_BASE_URL}/api/v1/members/${id}`
        : `${BACKEND_BASE_URL}/api/v1/members`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify(member),
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
              {isEdit ? '编辑党员信息' : '新增党员'}
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
                  value={member.name}
                  onChangeText={(text) => setMember({ ...member, name: text })}
                  placeholder="请输入姓名"
                />

                <FormItem
                  label="性别"
                  value={member.gender}
                  onChangeText={(text) => setMember({ ...member, gender: text })}
                  placeholder="请输入性别"
                />

                <FormItem
                  label="出生日期"
                  value={member.birthday}
                  onChangeText={(text) => setMember({ ...member, birthday: text })}
                  placeholder="YYYY-MM-DD"
                />

                <FormItem
                  label="部门 *"
                  value={member.department}
                  onChangeText={(text) => setMember({ ...member, department: text })}
                  placeholder="请输入部门"
                />

                <FormItem
                  label="职务"
                  value={member.position}
                  onChangeText={(text) => setMember({ ...member, position: text })}
                  placeholder="请输入职务"
                />

                <FormItem
                  label="联系电话"
                  value={member.phone}
                  onChangeText={(text) => setMember({ ...member, phone: text })}
                  placeholder="请输入联系电话"
                />

                <FormItem
                  label="邮箱"
                  value={member.email}
                  onChangeText={(text) => setMember({ ...member, email: text })}
                  placeholder="请输入邮箱"
                />
              </View>
            </View>

            {/* 党籍信息 */}
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <Text className="text-white font-bold text-lg mb-4">党籍信息</Text>

              <View className="space-y-4">
                <FormItem
                  label="政治面貌 *"
                  value={member.political_status}
                  onChangeText={(text) => setMember({ ...member, political_status: text })}
                  placeholder="请输入政治面貌"
                />

                <TouchableOpacity
                  onPress={() => setShowJoinDatePicker(true)}
                  className="border border-gray-600 rounded-lg px-4 py-3"
                >
                  <Text className="text-gray-400 text-sm mb-1">入党日期 *</Text>
                  <Text className={member.join_date ? 'text-white' : 'text-gray-500'}>
                    {member.join_date || '请选择日期'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowRegularDatePicker(true)}
                  className="border border-gray-600 rounded-lg px-4 py-3"
                >
                  <Text className="text-gray-400 text-sm mb-1">转正日期</Text>
                  <Text className={member.regular_date ? 'text-white' : 'text-gray-500'}>
                    {member.regular_date || '请选择日期'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowFeeMonthPicker(true)}
                  className="border border-gray-600 rounded-lg px-4 py-3"
                >
                  <Text className="text-gray-400 text-sm mb-1">党费缴纳年月</Text>
                  <Text className={member.last_fee_month ? 'text-white' : 'text-gray-500'}>
                    {member.last_fee_month || '请选择年月'}
                  </Text>
                  <FontAwesome6 name="calendar" size={14} color="#DC2626" style={{ position: 'absolute', right: 12, top: 40 }} />
                </TouchableOpacity>

                <FormItem
                  label="所属支部"
                  value={member.branch_name}
                  onChangeText={(text) => setMember({ ...member, branch_name: text })}
                  placeholder="请输入所属支部"
                />
              </View>
            </View>

            {/* 备注信息 */}
            <View className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
              <Text className="text-white font-bold text-lg mb-4">备注</Text>
              <TextInput
                className="bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 h-24"
                placeholder="请输入备注信息"
                placeholderTextColor="#6B7280"
                value={member.remarks}
                onChangeText={(text) => setMember({ ...member, remarks: text })}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        {/* 入党日期选择器 */}
        {showJoinDatePicker && (
          <DateTimePicker
            value={parseDate(member.join_date)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowJoinDatePicker(false);
              if (date) {
                setMember({ ...member, join_date: formatDate(date) });
              }
            }}
          />
        )}

        {/* 转正日期选择器 */}
        {showRegularDatePicker && (
          <DateTimePicker
            value={parseDate(member.regular_date)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowRegularDatePicker(false);
              if (date) {
                setMember({ ...member, regular_date: formatDate(date) });
              }
            }}
          />
        )}

        {/* 党费缴纳年月选择器 */}
        {showFeeMonthPicker && (
          <DateTimePicker
            value={member.last_fee_month ? parseDate(member.last_fee_month + '-01') : new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowFeeMonthPicker(false);
              if (date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                setMember({ ...member, last_fee_month: `${year}-${month}` });
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
