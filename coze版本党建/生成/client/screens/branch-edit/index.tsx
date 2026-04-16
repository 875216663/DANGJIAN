import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { requestJson } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { canCreateBranch } from '@/utils/rbac';

export default function BranchEdit() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const { id } = useSafeSearchParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRenewalPicker, setShowRenewalPicker] = useState(false);
  const [branch, setBranch] = useState({
    name: '',
    code: '',
    secretary_name: '',
    contact_phone: '',
    establish_date: '',
    renewal_reminder_date: '',
    description: '',
    remark: '',
    status: 'active',
  });

  useEffect(() => {
    if (!canCreateBranch(user)) {
      Alert.alert('无权限', '当前角色无权新建或编辑党支部', [
        { text: '返回', onPress: () => router.back() },
      ]);
      return;
    }

    if (isEdit) {
      void loadDetail();
    }
  }, [id, isEdit, user]);

  const loadDetail = async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const { data } = await requestJson<any>(`/api/v1/branches/${id}`);
      setBranch({
        name: data.name || '',
        code: data.code || '',
        secretary_name: data.secretary_name || '',
        contact_phone: data.contact_phone || '',
        establish_date: data.establish_date || '',
        renewal_reminder_date: data.renewal_reminder_date || '',
        description: data.description || '',
        remark: data.remark || '',
        status: data.status || 'active',
      });
    } catch (error) {
      console.error('Load branch detail error:', error);
      Alert.alert('加载失败', '支部信息加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!branch.name.trim()) {
      Alert.alert('提示', '请输入支部名称');
      return;
    }

    if (!branch.code.trim()) {
      Alert.alert('提示', '请输入支部代码');
      return;
    }

    try {
      setLoading(true);
      await requestJson(isEdit ? `/api/v1/branches/${id}` : '/api/v1/branches', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branch),
      });

      Alert.alert('保存成功', isEdit ? '党支部信息已更新' : '党支部已创建并写入数据库', [
        { text: '确定', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Save branch error:', error);
      Alert.alert('保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="flex-1 bg-red-50">
        <View className="bg-red-700 px-4 pb-4 pt-12">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={20} color="white" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">
              {isEdit ? '编辑党支部' : '新建党支部'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text className="font-semibold text-white">{loading ? '保存中' : '保存'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          <SectionCard title="基础信息">
            <FormItem label="支部名称 *" value={branch.name} onChangeText={(name) => setBranch({ ...branch, name })} />
            <FormItem label="支部代码 *" value={branch.code} onChangeText={(code) => setBranch({ ...branch, code })} />
            <FormItem
              label="支部书记"
              value={branch.secretary_name}
              onChangeText={(secretary_name) => setBranch({ ...branch, secretary_name })}
            />
            <FormItem
              label="联系电话"
              value={branch.contact_phone}
              onChangeText={(contact_phone) => setBranch({ ...branch, contact_phone })}
              keyboardType="phone-pad"
            />
            <DateField
              label="成立日期"
              value={branch.establish_date}
              onPress={() => setShowDatePicker(true)}
              icon="calendar"
            />
            <DateField
              label="换届提醒日期"
              value={branch.renewal_reminder_date}
              onPress={() => setShowRenewalPicker(true)}
              icon="calendar-days"
            />
          </SectionCard>

          <SectionCard title="支部说明">
            <MultilineItem
              label="支部职责描述"
              value={branch.description}
              onChangeText={(description) => setBranch({ ...branch, description })}
              placeholder="例如：负责组织生活、党员日常管理和档案维护。"
            />
            <MultilineItem
              label="补充备注"
              value={branch.remark}
              onChangeText={(remark) => setBranch({ ...branch, remark })}
              placeholder="可填写换届安排、年度重点事项等。"
            />
          </SectionCard>

          <SectionCard title="支部状态">
            <View className="flex-row">
              {[
                { value: 'active', label: '正常' },
                { value: 'inactive', label: '停用' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setBranch({ ...branch, status: item.value })}
                  className={`mr-3 flex-1 rounded-2xl border px-4 py-3 ${
                    branch.status === item.value
                      ? 'border-red-300 bg-red-50'
                      : 'border-red-100 bg-white'
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${
                      branch.status === item.value ? 'text-red-700' : 'text-slate-500'
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>
        </ScrollView>

        {showDatePicker ? (
          <DateTimePicker
            value={toDate(branch.establish_date)}
            mode="date"
            display="default"
            onChange={(_, value) => {
              setShowDatePicker(false);
              if (value) {
                setBranch({ ...branch, establish_date: formatDate(value) });
              }
            }}
          />
        ) : null}

        {showRenewalPicker ? (
          <DateTimePicker
            value={toDate(branch.renewal_reminder_date)}
            mode="date"
            display="default"
            onChange={(_, value) => {
              setShowRenewalPicker(false);
              if (value) {
                setBranch({ ...branch, renewal_reminder_date: formatDate(value) });
              }
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-3xl border border-red-100 bg-white p-4">
      <Text className="mb-4 text-base font-semibold text-red-700">{title}</Text>
      <View>{children}</View>
    </View>
  );
}

function FormItem({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm text-slate-500">{label}</Text>
      <TextInput
        className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-slate-900"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        placeholder={`请输入${label.replace('*', '').trim()}`}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

function MultilineItem({
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
    <View className="mb-4">
      <Text className="mb-2 text-sm text-slate-500">{label}</Text>
      <TextInput
        className="h-24 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-slate-900"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

function DateField({
  label,
  value,
  onPress,
  icon,
}: {
  label: string;
  value: string;
  onPress: () => void;
  icon: any;
}) {
  return (
    <TouchableOpacity onPress={onPress} className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
      <Text className="mb-1 text-sm text-slate-500">{label}</Text>
      <View className="flex-row items-center justify-between">
        <Text className={value ? 'text-slate-900' : 'text-slate-400'}>{value || '请选择日期'}</Text>
        <FontAwesome6 name={icon} size={14} color="#DC2626" />
      </View>
    </TouchableOpacity>
  );
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDate(value: string) {
  if (!value) {
    return new Date();
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}
