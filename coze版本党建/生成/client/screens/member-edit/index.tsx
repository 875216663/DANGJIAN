import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { requestJson } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { canCreateMember, isBranchSecretary } from '@/utils/rbac';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export default function MemberEdit() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const { id } = useSafeSearchParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showJoinDatePicker, setShowJoinDatePicker] = useState(false);
  const [showRegularDatePicker, setShowRegularDatePicker] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
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

  const selectedBranch = useMemo(
    () => branches.find((branch) => Number(branch.id) === Number(member.branch_id)),
    [branches, member.branch_id]
  );

  const selectedBranchName = selectedBranch?.name || member.branch_name;

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
  }, [id, isEdit, user]);

  const loadBranches = async () => {
    try {
      const { data } = await requestJson<any[]>('/api/v1/branches');
      const nextBranches = Array.isArray(data) ? data : [];
      setBranches(nextBranches);

      if (!member.branch_id && user?.branch_id) {
        const ownBranch = nextBranches.find((branch) => Number(branch.id) === Number(user.branch_id));
        if (ownBranch) {
          setMember((current) => ({
            ...current,
            branch_id: Number(ownBranch.id),
            branch_name: ownBranch.name,
          }));
        }
      }
    } catch (error) {
      console.error('Load branches error:', error);
      setBranches([]);
      Alert.alert('支部加载失败', '未能加载党支部列表，请确认后端服务和当前账号权限正常。');
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

    if (!member.join_date.trim() || !DATE_PATTERN.test(member.join_date.trim())) {
      Alert.alert('提示', '请输入正确的入党日期，格式为 YYYY-MM-DD');
      return;
    }

    if (member.birthday.trim() && !DATE_PATTERN.test(member.birthday.trim())) {
      Alert.alert('提示', '出生日期格式需为 YYYY-MM-DD');
      return;
    }

    if (member.regular_date.trim() && !DATE_PATTERN.test(member.regular_date.trim())) {
      Alert.alert('提示', '转正日期格式需为 YYYY-MM-DD');
      return;
    }

    if (member.last_fee_month.trim() && !MONTH_PATTERN.test(member.last_fee_month.trim())) {
      Alert.alert('提示', '党费缴纳年月格式需为 YYYY-MM');
      return;
    }

    if (!member.branch_id) {
      Alert.alert('提示', '请选择所属党支部');
      return;
    }

    const payload = {
      ...member,
      name: member.name.trim(),
      birthday: member.birthday.trim(),
      department: member.department.trim(),
      position: member.position.trim(),
      phone: member.phone.trim(),
      email: member.email.trim(),
      political_status: member.political_status.trim(),
      join_date: member.join_date.trim(),
      regular_date: member.regular_date.trim(),
      // 以 branch_id 作为唯一归属来源，避免 branch_name 文本差异导致后端鉴权误判
      branch_name: '',
      last_fee_month: member.last_fee_month.trim(),
      remarks: member.remarks.trim(),
    };

    try {
      setLoading(true);
      const { data } = await requestJson<any>(isEdit ? `/api/v1/members/${id}` : '/api/v1/members', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!isEdit && data?.account) {
        Toast.show({
          type: 'success',
          text1: '创建成功',
          text2: '党员信息与登录账号已同步生成',
        });
        Alert.alert(
          '创建成功',
          `党员信息已落库，并已同步生成系统账号。\n\n账号：${data.account.username}\n初始密码：${data.account.default_password}\n所属角色：${data.account.role_label}\n所属支部：${selectedBranchName || '未分配'}`,
          [
            {
              text: '查看党员列表',
              onPress: () => router.replace('/members'),
            },
          ]
        );
        return;
      }

      Toast.show({
        type: 'success',
        text1: '保存成功',
        text2: isEdit ? '党员信息已更新' : '党员已创建',
      });
      Alert.alert('保存成功', isEdit ? '党员信息已更新' : '党员已创建', [
        { text: '确定', onPress: () => router.replace('/members') },
      ]);
    } catch (error) {
      console.error('Save member error:', error);
      const errorMessage = error instanceof Error ? error.message : '请稍后重试';
      Toast.show({
        type: 'error',
        text1: '保存失败',
        text2: errorMessage,
      });
      Alert.alert('保存失败', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="flex-1 bg-[#FFF7F5]">
        <View className="bg-red-800 px-4 pb-4 pt-12">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={20} color="white" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">{isEdit ? '编辑党员' : '新建党员'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text className="font-semibold text-white">{loading ? '保存中' : '保存'}</Text>
            </TouchableOpacity>
          </View>

          <View className="mt-4 rounded-3xl bg-white/10 px-4 py-4">
            <Text className="text-sm font-semibold text-white">
              {branchLocked ? '本支部党员录入' : '党员建档与账号同步'}
            </Text>
            <Text className="mt-2 text-xs leading-5 text-red-100">
              {branchLocked
                ? `当前账号只能为“${user?.branch_name || '当前支部'}”录入党员，保存后会同步生成普通党员登录账号。`
                : '请完整填写党员基础信息、党籍信息和所属支部，保存后系统会自动创建对应登录账号。'}
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <SectionCard title="基础信息" subtitle="录入党员基本档案，用于通讯、组织关系和后续管理。">
            <FormItem label="姓名 *" value={member.name} onChangeText={(name) => setMember({ ...member, name })} />
            <SelectionRow
              label="性别"
              value={member.gender}
              options={['男', '女']}
              onSelect={(gender) => setMember({ ...member, gender })}
            />
            <DateLikeInput
              label="出生日期"
              value={member.birthday}
              placeholder="YYYY-MM-DD"
              helperText="网页端可直接手动输入，格式例如 1990-05-01。"
              onChangeText={(birthday) => setMember({ ...member, birthday })}
              onOpenPicker={Platform.OS === 'web' ? undefined : () => setShowBirthdayPicker(true)}
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

          <SectionCard title="党籍信息" subtitle="这些字段会直接进入党员台账，用于统计、提醒和报表。">
            <FormItem
              label="政治面貌"
              value={member.political_status}
              onChangeText={(political_status) => setMember({ ...member, political_status })}
            />
            <DateLikeInput
              label="入党日期 *"
              value={member.join_date}
              placeholder="YYYY-MM-DD"
              helperText="该字段为必填项，用于党员正式建档。"
              onChangeText={(join_date) => setMember({ ...member, join_date })}
              onOpenPicker={Platform.OS === 'web' ? undefined : () => setShowJoinDatePicker(true)}
            />
            <DateLikeInput
              label="转正日期"
              value={member.regular_date}
              placeholder="YYYY-MM-DD"
              helperText="预备党员可填写预计转正日期，正式党员可留空。"
              onChangeText={(regular_date) => setMember({ ...member, regular_date })}
              onOpenPicker={Platform.OS === 'web' ? undefined : () => setShowRegularDatePicker(true)}
            />
            <DateLikeInput
              label="党费缴纳年月"
              value={member.last_fee_month}
              placeholder="YYYY-MM"
              helperText="用于首页党费提醒统计，例如 2026-04。"
              onChangeText={(last_fee_month) => setMember({ ...member, last_fee_month })}
              onOpenPicker={Platform.OS === 'web' ? undefined : () => setShowFeeMonthPicker(true)}
            />
          </SectionCard>

          <SectionCard title="所属党支部" subtitle="创建党员时必须绑定党支部，后续账号会自动继承该支部。">
            <View className="rounded-3xl border border-red-100 bg-red-50 px-4 py-4">
              <Text className="text-sm text-slate-500">当前选择</Text>
              <Text className="mt-2 text-base font-semibold text-slate-900">
                {selectedBranchName || (branchLocked ? user?.branch_name || '未绑定支部' : '请选择所属党支部')}
              </Text>
              <Text className="mt-2 text-xs leading-5 text-slate-500">
                {branchLocked
                  ? '当前角色为党支部书记/委员，只允许给本支部新增党员。'
                  : '党建纪检部可在任意已存在支部下新建党员。'}
              </Text>
            </View>

            <View className="mt-4">
              {branches.length === 0 ? (
                <View className="rounded-3xl border border-dashed border-red-200 bg-white px-4 py-4">
                  <Text className="text-sm text-slate-500">暂无可选支部，请先创建党支部。</Text>
                </View>
              ) : (
                branches.map((branch) => {
                  const disabled = branchLocked && Number(branch.id) !== Number(user?.branch_id);
                  const active = Number(member.branch_id) === Number(branch.id);
                  return (
                    <TouchableOpacity
                      key={branch.id}
                      disabled={disabled}
                      onPress={() =>
                        setMember({
                          ...member,
                          branch_id: Number(branch.id),
                          branch_name: branch.name,
                        })
                      }
                      className={`mb-3 rounded-3xl border px-4 py-4 ${
                        active ? 'border-red-300 bg-red-50' : 'border-red-100 bg-white'
                      } ${disabled ? 'opacity-50' : ''}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-4">
                          <Text className={`text-base font-semibold ${active ? 'text-red-700' : 'text-slate-900'}`}>
                            {branch.name}
                          </Text>
                          <Text className="mt-2 text-xs leading-5 text-slate-500">
                            书记：{branch.secretary_name || '未设置'} · 党员 {branch.member_count || 0} 名
                          </Text>
                        </View>
                        {active ? <FontAwesome6 name="circle-check" size={18} color="#B91C1C" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </SectionCard>

          <SectionCard title="党员状态与备注" subtitle="状态用于统计看板，备注用于保存个性化说明。">
            <SelectionRow
              label="党员状态"
              value={member.status}
              options={[
                { value: 'active', label: '正式党员' },
                { value: 'probationary', label: '预备党员' },
                { value: 'transferred_out', label: '已转出' },
                { value: 'suspended', label: '暂停党籍' },
              ]}
              onSelect={(status) => setMember({ ...member, status })}
            />
            <View className="mt-4">
              <Text className="mb-2 text-sm text-slate-500">备注</Text>
              <TextInput
                className="h-28 rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-slate-900"
                value={member.remarks}
                onChangeText={(remarks) => setMember({ ...member, remarks })}
                placeholder="例如：培养考察情况、转正计划、组织关系变更说明等"
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
              />
            </View>
          </SectionCard>
        </ScrollView>

        {Platform.OS !== 'web' && showBirthdayPicker ? (
          <DateTimePicker
            value={toDate(member.birthday)}
            mode="date"
            display="default"
            onChange={(_, value) => {
              setShowBirthdayPicker(false);
              if (value) {
                setMember({ ...member, birthday: formatDate(value) });
              }
            }}
          />
        ) : null}
        {Platform.OS !== 'web' && showJoinDatePicker ? (
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
        {Platform.OS !== 'web' && showRegularDatePicker ? (
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
        {Platform.OS !== 'web' && showFeeMonthPicker ? (
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

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-[28px] border border-red-100 bg-white p-4">
      <Text className="text-base font-semibold text-red-700">{title}</Text>
      {subtitle ? <Text className="mt-2 text-xs leading-5 text-slate-500">{subtitle}</Text> : null}
      <View className="mt-4">{children}</View>
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
        className="rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-slate-900"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `请输入${label.replace('*', '').trim()}`}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

function DateLikeInput({
  label,
  value,
  placeholder,
  helperText,
  onChangeText,
  onOpenPicker,
}: {
  label: string;
  value: string;
  placeholder: string;
  helperText?: string;
  onChangeText: (text: string) => void;
  onOpenPicker?: () => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm text-slate-500">{label}</Text>
      <View className="flex-row items-center rounded-3xl border border-red-100 bg-red-50 px-4 py-2">
        <TextInput
          className="flex-1 py-1 text-slate-900"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
        />
        {onOpenPicker ? (
          <TouchableOpacity onPress={onOpenPicker} className="ml-3 rounded-full bg-white px-3 py-2">
            <FontAwesome6 name="calendar" size={14} color="#B91C1C" />
          </TouchableOpacity>
        ) : null}
      </View>
      {helperText ? <Text className="mt-2 text-xs leading-5 text-slate-500">{helperText}</Text> : null}
    </View>
  );
}

function SelectionRow({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: Array<string | { value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <View>
      <Text className="mb-2 text-sm text-slate-500">{label}</Text>
      <View className="flex-row flex-wrap">
        {options.map((option) => {
          const normalized = typeof option === 'string'
            ? { value: option, label: option }
            : option;

          return (
            <TouchableOpacity
              key={normalized.value}
              onPress={() => onSelect(normalized.value)}
              className={`mr-2 mt-2 rounded-full border px-4 py-2 ${
                value === normalized.value
                  ? 'border-red-300 bg-red-50'
                  : 'border-red-100 bg-white'
              }`}
            >
              <Text
                className={`text-sm ${
                  value === normalized.value ? 'text-red-700' : 'text-slate-500'
                }`}
              >
                {normalized.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDate(value: string) {
  if (!value || !DATE_PATTERN.test(value)) {
    return new Date();
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}
