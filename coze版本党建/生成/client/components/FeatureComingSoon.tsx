import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';

interface FeatureComingSoonProps {
  title: string;
  description: string;
  highlights?: string[];
}

export function FeatureComingSoon({
  title,
  description,
  highlights = [],
}: FeatureComingSoonProps) {
  const router = useSafeRouter();

  return (
    <Screen>
      <View className="flex-1 bg-gray-950">
        <View className="bg-red-900 px-4 pb-4 pt-12">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">{title}</Text>
            <View className="w-6" />
          </View>
        </View>

        <View className="flex-1 px-4 py-6">
          <View className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
            <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-red-950/60">
              <FontAwesome6 name="hammer" size={28} color="#F87171" />
            </View>
            <Text className="text-2xl font-bold text-white">{title} 正在建设中</Text>
            <Text className="mt-3 text-sm leading-6 text-gray-400">{description}</Text>

            {highlights.length > 0 && (
              <View className="mt-6 rounded-2xl bg-gray-950 px-4 py-4">
                <Text className="mb-3 text-sm font-semibold text-white">后续计划</Text>
                {highlights.map((item) => (
                  <View key={item} className="mb-2 flex-row items-start">
                    <FontAwesome6 name="circle" size={6} color="#F87171" style={{ marginTop: 7 }} />
                    <Text className="ml-3 flex-1 text-sm leading-6 text-gray-400">{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="mt-5 rounded-3xl border border-gray-800 bg-gray-900 p-5">
            <Text className="text-base font-semibold text-white">当前可用模块</Text>
            <Text className="mt-2 text-sm leading-6 text-gray-400">
              当前交付版优先完成“党员信息管理”和“党支部信息管理”。这两块数据会直接写入后端并长期保存到数据库。
            </Text>

            <View className="mt-5 flex-row">
              <TouchableOpacity
                onPress={() => router.push('/members')}
                className="mr-3 flex-1 rounded-2xl bg-red-900 py-3"
              >
                <Text className="text-center font-medium text-white">党员管理</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/branches')}
                className="flex-1 rounded-2xl border border-gray-700 bg-gray-800 py-3"
              >
                <Text className="text-center font-medium text-white">党支部管理</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}
