import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as DocumentPicker from 'expo-document-picker';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createFormDataFile } from '@/utils';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

interface StudyFile {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export default function Study() {
  const router = useSafeRouter();
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [loading, setLoading] = useState(false);

  // 加载学习资料列表
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      /**
       * 服务端文件：server/src/routes/study.ts
       * 接口：GET /api/v1/study/files
       */
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/study/files`);
      const data = await response.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Load files error:', error);
      Alert.alert('错误', '加载资料列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // 选择文件
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result);
        // 自动设置标题为文件名（不含扩展名）
        const fileName = result.assets[0].name;
        const titleWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        setTitle(titleWithoutExt);
      }
    } catch (error) {
      console.error('Pick file error:', error);
      Alert.alert('错误', '选择文件失败');
    }
  };

  // 上传文件
  const handleUpload = async () => {
    if (!selectedFile || !selectedFile.assets || selectedFile.assets.length === 0) {
      Alert.alert('提示', '请先选择文件');
      return;
    }

    if (!title.trim()) {
      Alert.alert('提示', '请输入资料标题');
      return;
    }

    try {
      setUploading(true);

      const asset = selectedFile.assets[0];
      const formData = new FormData();

      // 使用 createFormDataFile 创建跨平台兼容的文件对象
      const file = await createFormDataFile(
        asset.uri,
        asset.name,
        asset.mimeType || 'application/octet-stream'
      );
      formData.append('file', file as any);
      formData.append('title', title);
      formData.append('description', description);

      /**
       * 服务端文件：server/src/routes/study.ts
       * 接口：POST /api/v1/study/files
       * Body 参数：file: File, title: string, description?: string
       */
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/study/files`, {
        method: 'POST',
        headers: {
          'x-user-id': '1',
          'x-user-role': 'party_committee',
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('成功', '资料上传成功');
        setModalVisible(false);
        setTitle('');
        setDescription('');
        setSelectedFile(null);
        loadFiles();
      } else {
        const error = await response.json();
        Alert.alert('错误', error.error || '上传失败');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('错误', '上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 下载文件
  const handleDownload = async (downloadUrl: string, fileName: string) => {
    if (Platform.OS === 'web') {
      // Web端下载
      try {
        const response = await fetch(downloadUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Download error:', error);
        Alert.alert('错误', '下载失败');
      }
    } else {
      try {
        await Linking.openURL(downloadUrl);
      } catch (error) {
        console.error('Download error:', error);
        Alert.alert('错误', '下载失败');
      }
    }
  };

  // 删除文件
  const handleDelete = async (id: string) => {
    Alert.alert('确认删除', '确定要删除这个资料吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            /**
             * 服务端文件：server/src/routes/study.ts
             * 接口：DELETE /api/v1/study/files/:id
             */
            const response = await fetch(
              `${BACKEND_BASE_URL}/api/v1/study/files/${id}`,
              {
                method: 'DELETE',
                headers: {
                  'x-user-id': '1',
                  'x-user-role': 'party_committee',
                },
              }
            );

            if (response.ok) {
              Alert.alert('成功', '删除成功');
              loadFiles();
            } else {
              Alert.alert('错误', '删除失败');
            }
          } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 获取文件图标
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-powerpoint';
    if (mimeType.includes('image')) return 'file-image';
    if (mimeType.includes('video')) return 'file-video';
    if (mimeType.includes('audio')) return 'file-audio';
    return 'file';
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
            <Text className="text-white font-bold text-lg">学习教育</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="w-10 h-10 items-center justify-center"
            >
              <FontAwesome6 name="plus" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          {/* 统计信息 */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-gray-800 rounded-xl p-4 border border-gray-700">
              <Text className="text-gray-400 text-sm mb-1">资料总数</Text>
              <Text className="text-white font-bold text-2xl">{files.length}</Text>
            </View>
            <View className="flex-1 bg-gray-800 rounded-xl p-4 border border-gray-700">
              <Text className="text-gray-400 text-sm mb-1">累计大小</Text>
              <Text className="text-white font-bold text-2xl">
                {formatFileSize(files.reduce((sum, f) => sum + f.fileSize, 0))}
              </Text>
            </View>
          </View>

          {/* 学习资料列表 */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-bold text-lg">学习资料</Text>
            <TouchableOpacity onPress={loadFiles}>
              <FontAwesome6 name="rotate" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>

          {loading && files.length === 0 ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#DC2626" />
              <Text className="text-gray-400 mt-3">加载中...</Text>
            </View>
          ) : files.length === 0 ? (
            <View className="bg-gray-800 rounded-xl p-8 items-center border border-gray-700">
              <FontAwesome6 name="folder-open" size={48} color="#4B5563" />
              <Text className="text-gray-400 mt-3 text-center">暂无学习资料</Text>
              <Text className="text-gray-500 text-sm mt-1">点击右上角 + 号上传资料</Text>
            </View>
          ) : (
            <View className="gap-3">
              {files.map((file) => (
                <View
                  key={file.id}
                  className="bg-gray-800 rounded-xl p-4 border border-gray-700"
                >
                  <View className="flex-row items-start">
                    <View className="w-12 h-12 bg-red-900/20 rounded-lg items-center justify-center mr-3">
                      <FontAwesome6
                        name={getFileIcon(file.mimeType) as any}
                        size={24}
                        color="#DC2626"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-medium text-base mb-1" numberOfLines={1}>
                        {file.title}
                      </Text>
                      {file.description && (
                        <Text className="text-gray-400 text-sm mb-2" numberOfLines={2}>
                          {file.description}
                        </Text>
                      )}
                      <View className="flex-row items-center gap-3">
                        <Text className="text-gray-500 text-xs">{file.fileName}</Text>
                        <Text className="text-gray-500 text-xs">{formatFileSize(file.fileSize)}</Text>
                      </View>
                    </View>
                  </View>
                  <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-700">
                    <TouchableOpacity
                      className="flex-1 bg-red-900 rounded-lg py-2 items-center"
                      onPress={() => file.downloadUrl && handleDownload(file.downloadUrl, file.fileName)}
                    >
                      <View className="flex-row items-center justify-center">
                        <FontAwesome6 name="download" size={16} color="white" />
                        <Text className="text-white text-sm ml-2">下载</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-gray-700 rounded-lg py-2 items-center"
                      onPress={() => handleDelete(file.id)}
                    >
                      <View className="flex-row items-center justify-center">
                        <FontAwesome6 name="trash" size={16} color="#EF4444" />
                        <Text className="text-red-400 text-sm ml-2">删除</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* 上传资料弹窗 */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-gray-800 rounded-t-3xl">
              <View className="px-4 pt-4 pb-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white font-bold text-lg">上传学习资料</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <FontAwesome6 name="xmark" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView className="px-4 py-4">
                {/* 选择文件 */}
                <TouchableOpacity
                  className="bg-gray-700 rounded-xl p-4 mb-4 border-2 border-dashed border-gray-600"
                  onPress={pickFile}
                >
                  {selectedFile && selectedFile.assets && selectedFile.assets.length > 0 ? (
                    <View className="flex-row items-center">
                      <FontAwesome6 name="file-circle-check" size={24} color="#10B981" />
                      <View className="flex-1 ml-3">
                        <Text className="text-white font-medium" numberOfLines={1}>
                          {selectedFile.assets[0].name}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                          {formatFileSize(selectedFile.assets[0].size || 0)}
                        </Text>
                      </View>
                      <FontAwesome6 name="chevron-right" size={16} color="#9CA3AF" />
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-center">
                      <FontAwesome6 name="cloud-arrow-up" size={24} color="#DC2626" />
                      <Text className="text-gray-300 ml-2">点击选择文件</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* 资料标题 */}
                <View className="mb-4">
                  <Text className="text-gray-300 text-sm mb-2">资料标题 *</Text>
                  <TextInput
                    className="bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600"
                    placeholder="请输入资料标题"
                    placeholderTextColor="#6B7280"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* 资料描述 */}
                <View className="mb-4">
                  <Text className="text-gray-300 text-sm mb-2">资料描述（可选）</Text>
                  <TextInput
                    className="bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 h-24"
                    placeholder="请输入资料描述"
                    placeholderTextColor="#6B7280"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>

              {/* 操作按钮 */}
              <View className="px-4 pb-8 pt-2">
                <TouchableOpacity
                  className="bg-red-900 rounded-xl py-3 items-center"
                  onPress={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">上传资料</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
