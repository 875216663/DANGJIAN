import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { getApiUrl } from '@/utils/api';

interface Member {
  id: number;
  name: string;
  department?: string;
  position?: string;
}

interface SelectedMember extends Member {
  reason?: string; // 缺席原因
}

interface MemberSelectorProps {
  visible: boolean;
  mode: 'attendees' | 'absentees'; // 参会人员或缺席人员
  selectedMembers: SelectedMember[];
  onClose: () => void;
  onConfirm: (members: SelectedMember[]) => void;
  branchId?: number; // 可选，如果指定则只显示该支部的党员
}

export default function MemberSelector({
  visible,
  mode,
  selectedMembers,
  onClose,
  onConfirm,
  branchId,
}: MemberSelectorProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [absenteeReasons, setAbsenteeReasons] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  // 加载党员列表
  useEffect(() => {
    if (visible) {
      fetchMembers();
    }
  }, [visible, branchId]);

  // 初始化选中的党员
  useEffect(() => {
    if (visible && selectedMembers.length > 0) {
      const ids = new Set(selectedMembers.map(m => m.id));
      setSelectedIds(ids);
      const reasons: Record<number, string> = {};
      selectedMembers.forEach(m => {
        if (m.reason) {
          reasons[m.id] = m.reason;
        }
      });
      setAbsenteeReasons(reasons);
    } else if (visible) {
      setSelectedIds(new Set());
      setAbsenteeReasons({});
    }
  }, [visible, selectedMembers]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const url = branchId
        ? getApiUrl(`/api/v1/branches/${branchId}/members`)
        : getApiUrl('/api/v1/members');
      const response = await fetch(url);
      const data = await response.json();
      setMembers(data.data || data || []);
    } catch (error) {
      console.error('Fetch members error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (memberId: number) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(memberId)) {
      newSelectedIds.delete(memberId);
      setAbsenteeReasons(prev => {
        const newReasons = { ...prev };
        delete newReasons[memberId];
        return newReasons;
      });
    } else {
      newSelectedIds.add(memberId);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleReasonChange = (memberId: number, reason: string) => {
    setAbsenteeReasons(prev => ({ ...prev, [memberId]: reason }));
  };

  const handleConfirm = () => {
    const selectedMembersList = members
      .filter(m => selectedIds.has(m.id))
      .map(m => ({
        ...m,
        reason: mode === 'absentees' ? absenteeReasons[m.id] || '' : undefined,
      }));
    onConfirm(selectedMembersList);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-gray-800 rounded-t-3xl max-h-[80%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-700">
              <Text className="text-white font-bold text-lg">
                {mode === 'attendees' ? '选择参会人员' : '选择缺席人员'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <FontAwesome6 name="xmark" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-6 py-4">
              {loading ? (
                <View className="items-center py-8">
                  <Text className="text-gray-400">加载中...</Text>
                </View>
              ) : members.length === 0 ? (
                <View className="items-center py-8">
                  <Text className="text-gray-400">暂无党员数据</Text>
                </View>
              ) : (
                members.map((member) => {
                  const isSelected = selectedIds.has(member.id);
                  return (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => toggleMember(member.id)}
                      className={`flex-row items-center p-4 rounded-xl mb-2 ${
                        isSelected ? 'bg-red-900/20 border border-red-500' : 'bg-gray-700 border border-gray-600'
                      }`}
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center space-x-2">
                          <FontAwesome6
                            name={isSelected ? 'circle-check' : 'circle'}
                            size={20}
                            color={isSelected ? '#DC2626' : '#9CA3AF'}
                          />
                          <Text
                            className={`font-medium ${isSelected ? 'text-red-500' : 'text-white'}`}
                          >
                            {member.name}
                          </Text>
                        </View>
                        {member.department && (
                          <Text className="text-gray-400 text-sm ml-7">{member.department}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* 缺席原因输入区域 */}
            {mode === 'absentees' && selectedIds.size > 0 && (
              <View className="px-6 py-4 border-t border-gray-700">
                <Text className="text-gray-400 text-sm mb-2">请输入缺席人员的缺席原因：</Text>
                {Array.from(selectedIds).map((memberId) => {
                  const member = members.find(m => m.id === memberId);
                  if (!member) return null;
                  return (
                    <View key={memberId} className="mb-3">
                      <Text className="text-white text-sm mb-1">{member.name} 的缺席原因：</Text>
                      <TextInput
                        className="bg-gray-700 rounded-lg p-3 text-white border border-gray-600"
                        placeholder="请输入缺席原因（如：出差、请假等）"
                        placeholderTextColor="#6B7280"
                        value={absenteeReasons[memberId] || ''}
                        onChangeText={(text) => handleReasonChange(memberId, text)}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {/* Footer */}
            <View className="flex-row space-x-3 p-4 border-t border-gray-700">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 bg-gray-700 py-3 rounded-xl"
              >
                <Text className="text-white text-center font-medium">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                className="flex-1 bg-red-600 py-3 rounded-xl"
              >
                <Text className="text-white text-center font-medium">确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
