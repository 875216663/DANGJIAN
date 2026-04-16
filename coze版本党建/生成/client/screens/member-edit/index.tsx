import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { requestJson } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { canCreateMember, isBranchSecretary } from '@/utils/rbac';

export default function MemberEdit() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const { id } = useSafeSearchParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showJoinDatePicker, setShowJoinDatePicker] = useState(false);
  const [showRegularDatePicker, setShowRegularDatePicker] = useState(false);
  const [showFeeMonthPicker, setShowFeeMonthPicker] = useState(false);
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
    branch_id: user?.branch_id || 0,
    branch_name: user?.branch_name || '',
    last_fee_month: '',
    status: 'active',
    remarks: '',
  });

  const branchLocked = isBranchSecretary(user);
  const selectedBranchName = useMemo(() => {
    if (member.branch_id) {
      return branches.find((branch) => branch.id === member.branch_id)?.name || member.branch_name;
    }
    return member.branch_name;
  }, [branches, member.branch_id, member.branch_name]);

  useEffect(() => {
    if (!canCreateMember(user)) {
      Alert.alert('无权限', isEdit ? '当前角色无权编辑党员' : '当前角色无权新增党员', [
        { text: '返回', onPress: () => router.back() },
      ]);
      return;
    }

    void loadBranches();
    if (isEdit) {
      void loadMemberDetail();
    }
  }, [id, user]);

  const loadBranches = async () => {
    try {
      const { data } = await requestJson<any[]>('/api/v1/branches');
      const nextBranches = Array.isArray(data) ? data : [];
      setBranches(nextBranches);

      if (!member.branch_id && user?.branch_id) {
        const ownBranch = nextBranches.find((branch) => branch.id === user.branch_id);
        setMember((current) => ({
          ...current,
          branch_id: ownBranch?.id || current.branch_id,
          branch_name: ownBranch?.name || current.branch_name,
        }));
      }
    } catch (error) {
      console.error('Load branches error:', error);
      setBranches([]);
    }
  };

  const loadMemberDetail = async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const { data } = await requestJson<any>(`/api/v1/members/${id}`);
      setMember({
        name: data.name || '',
        gender: data.gender || '男',
        birthday: data.birthday || '',
        department: data.department || '',
        position: data.position || '',
        phone: data.phone || '',
        email: data.email || '',
        political_status: data.political_status || '中共党员',
        join_date: data.join_date || '',
        regular_date: data.regular_date || '',
        branch_id: data.branch_id || 0,
        branch_name: data.branch_name || '',
        last_fee_month: data.last_fee_month || '',
        status: data.status || 'active',
        remarks: data.remarks || '',
      });
    } catch (error) {
      console.error('Load member detail error:', error);
      Alert.alert('加载失败', '党员信息加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!member.name.trim()) {
      Alert.alert('提示', '请输入党员姓名');
      return;
    }

    if (!member.join_date.trim()) {
      Alert.alert('提示', '请选择入党日期');
      return;
    }

    if (!member.branch_id) {
      Alert.alert('提示', '请选择所属党支部');
      return;
    }

    try {
      setLoading(true);
      const { data } = await requestJson<any>(isEdit ? `/api/v1/members/${id}` : '/api/v1/members', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...member,
          branch_name: selectedBranchName,
        }),
      });

      if (!isEdit && data?.account) {
        Alert.alert(
          '创建成功',
          `党员信息已落库，并同步生成账号。\n账号：${data.account.username}\n初始密码：${data.account.default_password}`,
          [{ text: '确定', onPress: () => router.back() }]
        );
        return;
      }

      Alert.alert('保存成功', isEdit ? '党员信息已更新' : '党员已创建', [
        { text: '确定', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Save member error:', error);
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
            <Text className="text-lg font-bold text-white">{isEdit ? '编辑党员' : '新建党员'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text className="font-semibold text-white">{loading ? '保存中' : '保存'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          <SectionCard title="基础信息">
            <FormItem label="姓名 *" value={member.name} onChangeText={(name) => setMember({ ...member, name })} />
            <FormItem label="性别" value={member.gender} onChangeText={(gender) => setMember({ ...member, gender })} />
            <FormItem
              label="出生日期"
              value={member.birthday}
              onChangeText={(birthday) => setMember({ ...member, birthday })}
              placeholder="YYYY-MM-DD"
            />
            <FormItem
              label="部门"
              value={member.department}
              onChangeText={(department) => setMember({ ...member, department })}
            />
            <FormItem
              label="职务"
              value={member.position}
              onChangeText={(position) => setMember({ ...member, position })}
            />
            <FormItem
              label="手机号"
              value={member.phone}
              onChangeText={(phone) => setMember({ ...member, phone })}
              keyboardType="phone-pad"
            />
            <FormItem
              label="邮箱"
              value={member.email}
              onChangeText={(email) => setMember({ ...member, email })}
              keyboardType="email-address"
            />
          </SectionCard>

          <SectionCard title="党籍信息">
            <FormItem
              label="政治面貌"
              value={member.political_status}
              onChangeText={(political_status) => setMember({ ...member, political_status })}
            />
            <DateField label="入党日期 *" value={member.join_date} onPress={() => setShowJoinDatePicker(true)} />
            <DateField label="转正日期" value={member.regular_date} onPress={() => setShowRegularDatePicker(true)} />
            <DateField label="党费缴纳年月" value={member.last_fee_month} onPress={() => setShowFeeMonthPicker(true)} />

            <View className="mb-4">
              <Text className="mb-2 text-sm text-slate-500">所属党支部 *</Text>
              <View className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <Text className="text-slate-900">
                  {selectedBranchName || (branchLocked ? user?.branch_name || '未绑定支部' : '请选择所属党支部')}
                </Text>
              </View>
              <Text className="mt-2 text-xs leading-5 text-slate-500">
                {branchLocked
                  ? '当前角色为党支部书记/委员，新增党员时只能选择本支部。'
                  : '党建纪检部可选择任意已存在支部。'}
              </Text>
              <View className="mt-3 flex-row flex-wrap">
                {branches.map((branch) => {
                  const disabled = branchLocked && branch.id !== user?.branch_id;
                  return (
                    <TouchableOpacity
                      key={branch.id}
                      disabled={disabled}
                      onPress={() =>
                        setMember({
                          ...member,
                          branch_id: branch.id,
                          branch_name: branch.name,
                        })
                      }
                      className={`mr-2 mt-2 rounded-full border px-3 py-2 ${
                        member.branch_id === branch.id
                          ? 'border-red-300 bg-red-50'
                          : 'border-red-100 bg-white'
                      } ${disabled ? 'opacity-50' : ''}`}
                    >
                      <Text
                        className={`text-xs ${
                          member.branch_id === branch.id ? 'text-red-700' : 'text-slate-500'
                        }`}
                      >
                        {branch.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </SectionCard>

          <SectionCard title="党员状态">
            <View className="flex-row flex-wrap">
              {[
                { value: 'active', label: '正式党员' },
                { value: 'probationary', label: '预备党员' },
                { value: 'transferred_out', label: '已转出' },
                { value: 'suspended', label: '暂停党籍' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setMember({ ...member, status: item.value })}
                  className={`mr-2 mt-2 rounded-full border px-4 py-2 ${
                    member.status === item.value
                      ? 'border-red-300 bg-red-50'
                      : 'border-red-100 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      member.status === item.value ? 'text-red-700' : 'text-slate-500'
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          <SectionCard title="备注">
            <TextInput
              className="h-24 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-slate-900"
              value={member.remarks}
              onChangeText={(remarks) => setMember({ ...member, remarks })}
              placeholder="可填写培养情况、转正计划等说明"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
            />
          </SectionCard>
        </ScrollView>

        {showJoinDatePicker ? (
          <DateTimePicker
            value={toDate(member.join_date)}
            mode="date"
            display="default"
            onChange={(_, value) => {
              setShowJoinDatePicker(false);
              if (value) {
                setMember({ ...member, join_date: formatDate(value) });
              }
            }}
          />
        ) : null}
        {showRegularDatePicker ? (
          <DateTimePicker
            value={toDate(member.regular_date)}
            mode="date"
            display="default"
            onChange={(_, value) => {
              setShowRegularDatePicker(false);
              if (value) {
                setMember({ ...member, regular_date: formatDate(value) });
              }
            }}
          />
        ) : null}
        {showFeeMonthPicker ? (
          <DateTimePicker
            value={toDate(member.last_fee_month ? `${member.last_fee_month}-01` : '')}
            mode="date"
            display="default"
            onChange={(_, value) => {
              setShowFeeMonthPicker(false);
              if (value) {
                setMember({
                  ...member,
                  last_fee_month: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`,
                });
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
      {children}
    </View>
  );
}

function FormItem({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm text-slate-500">{label}</Text>
      <TextInput
        className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-slate-900"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `请输入${label.replace('*', '').trim()}`}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

function DateField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
      <Text className="mb-1 text-sm text-slate-500">{label}</Text>
      <View className="flex-row items-center justify-between">
        <Text className={value ? 'text-slate-900' : 'text-slate-400'}>{value || '请选择日期'}</Text>
        <FontAwesome6 name="calendar" size={14} color="#DC2626" />
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
