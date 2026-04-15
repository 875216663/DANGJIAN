import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { createFormDataFile } from '@/utils';
import { getApiUrl } from '@/utils/api';

export default function Members() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const canManage = user?.role !== 'member' && user?.role !== 'branch_member';

  // 加载党员列表
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        ...(searchKeyword && { search: searchKeyword }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(getApiUrl(`/api/v1/members?${params}`));

      const data = await response.json();
      setMembers(data.data || []);
    } catch (error) {
      console.error('Load members error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, statusFilter]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  // 导出数据
  const handleExport = async () => {
    try {
      const response = await fetch(getApiUrl('/api/v1/members/export'));

      if (response.ok) {
        await response.blob();
        Alert.alert('成功', '导出成功');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('错误', '导出失败');
    }
  };

  // 选择导入文件
  const pickImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result);
      }
    } catch (error) {
      console.error('Pick file error:', error);
      Alert.alert('错误', '选择文件失败');
    }
  };

  // 确认导入
  const handleImport = async () => {
    if (!selectedFile || !selectedFile.assets || selectedFile.assets.length === 0) {
      Alert.alert('提示', '请先选择文件');
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

      /**
       * 服务端文件：server/src/routes/members.ts
       * 接口：POST /api/v1/members/import
       * Body 参数：file: File
       */
      const response = await fetch(getApiUrl('/api/v1/members/import'), {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('成功', data.message || '导入成功');
        setShowImportModal(false);
        setSelectedFile(null);
        loadMembers();
      } else {
        const error = await response.json();
        Alert.alert('错误', error.error || '导入失败');
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('错误', '导入失败');
    } finally {
      setImporting(false);
    }
  };

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'probationary':
        return '#F59E0B';
      case 'transferred_out':
        return '#6B7280';
      case 'suspended':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // 状态文本映射
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '正常';
      case 'probationary':
        return '预备党员';
      case 'transferred_out':
        return '转出';
      case 'suspended':
        return '停止党籍';
      default:
        return status;
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
            <Text className="text-white font-bold text-lg">党员管理</Text>
            {canManage ? (
              <TouchableOpacity onPress={() => router.push('/member-edit')}>
                <FontAwesome6 name="plus" size={22} color="white" />
              </TouchableOpacity>
            ) : (
              <View className="w-6" />
            )}
          </View>
        </View>

        {/* 搜索栏 */}
        <View className="px-4 py-3 bg-gray-800">
          <View className="flex-row items-center space-x-3">
            <View className="flex-1 flex-row items-center bg-gray-700 rounded-lg px-3 py-2">
              <FontAwesome6 name="magnifying-glass" size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-2 text-white"
                placeholder="搜索姓名、部门..."
                placeholderTextColor="#6B7280"
                value={searchKeyword}
                onChangeText={setSearchKeyword}
              />
            </View>
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              className="bg-gray-700 px-4 py-2 rounded-lg"
            >
              <FontAwesome6 name="filter" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 操作栏 */}
        <View className="px-4 py-2 flex-row justify-between items-center">
          <Text className="text-gray-400 text-sm">共 {members.length} 名党员</Text>
          <View className="flex-row space-x-2">
            {canManage && (
              <TouchableOpacity
                onPress={() => setShowImportModal(true)}
                className="bg-red-900 px-4 py-2 rounded-lg flex-row items-center"
              >
                <FontAwesome6 name="file-import" size={16} color="white" />
                <Text className="text-white text-sm ml-2">导入</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleExport}
              className="bg-gray-700 px-4 py-2 rounded-lg flex-row items-center"
            >
              <FontAwesome6 name="file-export" size={16} color="white" />
              <Text className="text-white text-sm ml-2">导出</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 列表 */}
        <ScrollView className="flex-1 px-4 py-2">
          {loading ? (
            <View className="py-20 items-center">
              <FontAwesome6 name="spinner" size={40} color="#DC2626" />
              <Text className="text-gray-500 mt-2">加载中...</Text>
            </View>
          ) : members.length === 0 ? (
            <View className="py-20 items-center">
              <FontAwesome6 name="users-slash" size={60} color="#374151" />
              <Text className="text-gray-500 mt-4">暂无数据</Text>
              {canManage && (
                <TouchableOpacity
                  onPress={() => router.push('/member-edit')}
                  className="mt-4 rounded-lg bg-red-900 px-6 py-3"
                >
                  <Text className="text-white">新增党员</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            members.map((member, index) => (
              <TouchableOpacity
                key={member.id}
                className="bg-gray-800 rounded-xl p-4 mb-3 border border-gray-700"
                onPress={() => router.push('/member-detail', { id: member.id })}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-white font-bold text-lg">{member.name}</Text>
                      <View
                        className="px-2 py-0.5 rounded"
                        style={{ backgroundColor: getStatusColor(member.status) + '20' }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: getStatusColor(member.status) }}
                        >
                          {getStatusText(member.status)}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-gray-400 text-sm mt-1">{member.department}</Text>
                    <Text className="text-gray-500 text-xs">{member.position}</Text>
                  </View>
                  <FontAwesome6 name="chevron-right" size={16} color="#6B7280" />
                </View>

                <View className="flex-row space-x-4 mt-3 pt-3 border-t border-gray-700">
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs">政治面貌</Text>
                    <Text className="text-gray-300 text-sm mt-1">{member.political_status}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs">入党日期</Text>
                    <Text className="text-gray-300 text-sm mt-1">
                      {member.join_date ? new Date(member.join_date).toLocaleDateString() : '-'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs">所属支部</Text>
                    <Text className="text-gray-300 text-sm mt-1">{member.branch_name}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* 筛选弹窗 */}
        <Modal visible={showFilterModal} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-gray-800 rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white font-bold text-lg">筛选条件</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <FontAwesome6 name="xmark" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <Text className="text-gray-400 mb-3">党员状态</Text>
              <View className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { value: '', label: '全部' },
                  { value: 'active', label: '正常' },
                  { value: 'probationary', label: '预备党员' },
                  { value: 'transferred_out', label: '转出' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => {
                      setStatusFilter(item.value);
                      setShowFilterModal(false);
                    }}
                    className={`py-3 rounded-lg border ${
                      statusFilter === item.value
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-gray-700 bg-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-center ${
                        statusFilter === item.value ? 'text-red-500' : 'text-gray-300'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => {
                  setStatusFilter('');
                  setSearchKeyword('');
                  setShowFilterModal(false);
                }}
                className="bg-gray-700 py-3 rounded-lg"
              >
                <Text className="text-white text-center">重置筛选</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 导入弹窗 */}
        <Modal visible={showImportModal} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-gray-800 rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white font-bold text-lg">导入党员信息</Text>
                <TouchableOpacity onPress={() => setShowImportModal(false)}>
                  <FontAwesome6 name="xmark" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {/* 选择文件 */}
              <TouchableOpacity
                className="bg-gray-700 rounded-xl p-4 mb-4 border-2 border-dashed border-gray-600"
                onPress={pickImportFile}
              >
                {selectedFile && selectedFile.assets && selectedFile.assets.length > 0 ? (
                  <View className="flex-row items-center">
                    <FontAwesome6 name="file-circle-check" size={24} color="#10B981" />
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-medium" numberOfLines={1}>
                        {selectedFile.assets[0].name}
                      </Text>
                    </View>
                    <FontAwesome6 name="circle-check" size={20} color="#10B981" />
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <FontAwesome6 name="cloud-arrow-up" size={24} color="#DC2626" />
                    <Text className="text-gray-300 ml-2">点击选择Excel文件</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Excel模板说明 */}
              <View className="bg-gray-700/50 rounded-lg p-3 mb-4">
                <Text className="text-gray-300 text-sm mb-2">Excel模板要求：</Text>
                <Text className="text-gray-400 text-xs">
                  必需字段：姓名、部门、政治面貌、入党日期、党费缴纳年月
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  可选字段：性别、职务、转正日期、联系电话、邮箱、所属支部、状态
                </Text>
              </View>

              {/* 操作按钮 */}
              <View className="space-y-3">
                <TouchableOpacity
                  className="bg-red-900 rounded-xl py-3 items-center"
                  onPress={handleImport}
                  disabled={importing || !selectedFile}
                >
                  {importing ? (
                    <Text className="text-white text-center font-medium">导入中...</Text>
                  ) : (
                    <Text className="text-white text-center font-medium">开始导入</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-gray-700 rounded-xl py-3 items-center"
                  onPress={() => setShowImportModal(false)}
                >
                  <Text className="text-white text-center">取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
