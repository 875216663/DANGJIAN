import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { createFormDataFile } from '@/utils';
import { getApiMessage, getApiUrl, requestJson } from '@/utils/api';
import { canCreateMember, isPartyMember } from '@/utils/rbac';

export default function Members() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const allowCreate = canCreateMember(user);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
        ...(searchKeyword ? { search: searchKeyword } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const { data, meta } = await requestJson<any[]>(`/api/v1/members?${params.toString()}`);
      setMembers(Array.isArray(data) ? data : []);
      setTotalCount(
        typeof meta?.total === 'number' ? meta.total : Array.isArray(data) ? data.length : 0
      );
    } catch (error) {
      console.error('Load members error:', error);
      setMembers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  const handleExport = async () => {
    try {
      const response = await fetch(getApiUrl('/api/v1/members/export'));
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        Alert.alert('导出失败', getApiMessage(payload, '请稍后重试'));
        return;
      }

      Alert.alert('导出成功', '党员数据已由浏览器开始下载');
    } catch (error) {
      console.error('Export members error:', error);
      Alert.alert('导出失败', '网络异常，请稍后重试');
    }
  };

  const pickImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length) {
        setSelectedFile(result);
      }
    } catch (error) {
      console.error('Pick import file error:', error);
      Alert.alert('选择失败', '文件选择失败，请稍后重试');
    }
  };

  const handleImport = async () => {
    if (!selectedFile?.assets?.length) {
      Alert.alert('提示', '请先选择要导入的 Excel 文件');
      return;
    }

    try {
      setImporting(true);
      const asset = selectedFile.assets[0];
      const formData = new FormData();
      const file = await createFormDataFile(
        asset.uri,
        asset.name,
        asset.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      formData.append('file', file as any);

      const response = await fetch(getApiUrl('/api/v1/members/import'), {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        Alert.alert('导入失败', getApiMessage(payload, '请稍后重试'));
        return;
      }

      Alert.alert('导入成功', getApiMessage(payload, '党员导入成功'));
      setSelectedFile(null);
      setShowImportModal(false);
      await loadMembers();
    } catch (error) {
      console.error('Import members error:', error);
      Alert.alert('导入失败', '网络异常，请稍后重试');
    } finally {
      setImporting(false);
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
            <Text className="text-lg font-bold text-white">党员管理</Text>
            {allowCreate ? (
              <TouchableOpacity onPress={() => router.push('/member-edit')}>
                <FontAwesome6 name="plus" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <View className="w-5" />
            )}
          </View>
          <Text className="mt-3 text-xs text-red-100">
            {allowCreate
              ? '新增党员时会自动创建对应登录账号，账号默认初始密码统一配置。'
              : isPartyMember(user)
              ? '当前账号仅展示个人党员档案。'
              : '当前账号为查看型角色，不显示党员新增入口。'}
          </Text>
        </View>

        <View className="px-4 py-4">
          <View className="rounded-2xl border border-red-100 bg-white px-3 py-3">
            <View className="flex-row items-center">
              <FontAwesome6 name="magnifying-glass" size={16} color="#94A3B8" />
              <TextInput
                className="ml-2 flex-1 text-slate-900"
                placeholder="搜索姓名、部门、支部或手机号"
                placeholderTextColor="#94A3B8"
                value={searchKeyword}
                onChangeText={setSearchKeyword}
              />
              <TouchableOpacity onPress={() => setShowFilterModal(true)}>
                <FontAwesome6 name="filter" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-red-100 bg-white px-4 py-3">
            <Text className="text-sm text-slate-500">当前共 {totalCount} 名党员</Text>
            <View className="flex-row">
              {allowCreate ? (
                <TouchableOpacity
                  onPress={() => setShowImportModal(true)}
                  className="mr-2 rounded-full border border-red-200 bg-red-50 px-3 py-2"
                >
                  <Text className="text-xs font-medium text-red-700">导入</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={handleExport}
                className="rounded-full border border-red-200 bg-red-50 px-3 py-2"
              >
                <Text className="text-xs font-medium text-red-700">导出</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pb-6">
          {loading ? (
            <EmptyState icon="spinner" title="正在加载党员数据..." />
          ) : members.length === 0 ? (
            <EmptyState
              icon="users"
              title={allowCreate ? '暂无党员数据，请先新增党员' : '当前暂无可查看的党员数据'}
              actionLabel={allowCreate ? '新建党员' : undefined}
              onPress={allowCreate ? () => router.push('/member-edit') : undefined}
            />
          ) : (
            members.map((member) => (
              <TouchableOpacity
                key={member.id}
                className="mb-3 rounded-3xl border border-red-100 bg-white p-4"
                onPress={() => router.push('/member-detail', { id: member.id })}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-semibold text-slate-900">{member.name}</Text>
                      <View className="ml-2 rounded-full bg-red-50 px-2 py-1">
                        <Text className="text-xs text-red-700">
                          {member.status === 'active' ? '正式党员' : member.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-2 text-sm text-slate-600">
                      {member.branch_name || '未分配支部'} · {member.department || '未设置部门'}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {member.position || '未设置职务'}
                      {member.phone ? ` · ${member.phone}` : ''}
                    </Text>
                  </View>
                  <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <Modal visible={showFilterModal} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/20">
            <View className="rounded-t-3xl bg-white p-6">
              <View className="mb-6 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-red-700">筛选党员状态</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <FontAwesome6 name="xmark" size={20} color="#B91C1C" />
                </TouchableOpacity>
              </View>
              <View className="grid grid-cols-2 gap-3">
                {[
                  { value: '', label: '全部' },
                  { value: 'active', label: '正式党员' },
                  { value: 'probationary', label: '预备党员' },
                  { value: 'transferred_out', label: '已转出' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => {
                      setStatusFilter(item.value);
                      setShowFilterModal(false);
                    }}
                    className={`rounded-2xl border px-4 py-3 ${
                      statusFilter === item.value
                        ? 'border-red-300 bg-red-50'
                        : 'border-red-100 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-center font-medium ${
                        statusFilter === item.value ? 'text-red-700' : 'text-slate-500'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showImportModal} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/20">
            <View className="rounded-t-3xl bg-white p-6">
              <View className="mb-6 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-red-700">批量导入党员</Text>
                <TouchableOpacity onPress={() => setShowImportModal(false)}>
                  <FontAwesome6 name="xmark" size={20} color="#B91C1C" />
                </TouchableOpacity>
              </View>
              <Text className="text-sm leading-6 text-slate-500">
                仅当前允许导入基础党员信息；本次重点交付仍以“单个新增党员并同步创建账号”为主。
              </Text>

              <TouchableOpacity
                onPress={pickImportFile}
                className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4"
              >
                <Text className="text-center font-medium text-red-700">
                  {selectedFile?.assets?.[0]?.name || '选择 Excel 文件'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleImport}
                disabled={importing}
                className="mt-4 rounded-2xl bg-red-700 px-4 py-4"
              >
                <Text className="text-center font-medium text-white">
                  {importing ? '导入中...' : '开始导入'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

function EmptyState({
  icon,
  title,
  actionLabel,
  onPress,
}: {
  icon: any;
  title: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View className="items-center rounded-3xl border border-red-100 bg-white px-4 py-16">
      <FontAwesome6 name={icon} size={40} color="#F87171" />
      <Text className="mt-4 text-sm text-slate-500">{title}</Text>
      {actionLabel && onPress ? (
        <TouchableOpacity onPress={onPress} className="mt-4 rounded-full bg-red-700 px-5 py-3">
          <Text className="font-medium text-white">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
