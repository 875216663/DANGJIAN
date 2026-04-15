import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  // 添加其它想暂时忽略的错误或警告信息
]);

export default function RootLayout() {
  return (
    <Provider>
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false
        }}
      >
        <Stack.Screen name="(tabs)" options={{ title: "" }} />
        <Stack.Screen name="members" options={{ title: "党员管理" }} />
        <Stack.Screen name="member-detail" options={{ title: "党员详情" }} />
        <Stack.Screen name="member-edit" options={{ title: "编辑党员" }} />
        <Stack.Screen name="branches" options={{ title: "党支部管理" }} />
        <Stack.Screen name="branch-detail" options={{ title: "支部详情" }} />
        <Stack.Screen name="branch-edit" options={{ title: "编辑支部" }} />
        <Stack.Screen name="branch-activists" options={{ title: "入党积极分子" }} />
        <Stack.Screen name="activist-edit" options={{ title: "编辑积极分子" }} />
        <Stack.Screen name="meetings" options={{ title: "三会一课" }} />
        <Stack.Screen name="meeting-form" options={{ title: "会议记录" }} />
        <Stack.Screen name="meeting-detail" options={{ title: "会议详情" }} />
        <Stack.Screen name="study" options={{ title: "学习教育" }} />
        <Stack.Screen name="supervision" options={{ title: "纪检监督" }} />
        <Stack.Screen name="admin" options={{ title: "系统管理" }} />
      </Stack>
      <Toast />
    </Provider>
  );
}
