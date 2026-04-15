import React, { type ReactNode } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

const AUTH_STORAGE_KEY = 'dangjian-auth-user-id-v2';

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || '前端页面运行异常',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App runtime error:', error, errorInfo);
  }

  private handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleReset = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View className="flex-1 items-center justify-center bg-gray-950 px-6">
        <View className="w-full max-w-xl rounded-3xl border border-red-950/40 bg-gray-900 p-6">
          <Text className="text-sm text-red-300">系统异常保护</Text>
          <Text className="mt-3 text-2xl font-bold text-white">页面发生运行时错误</Text>
          <Text className="mt-3 text-sm leading-6 text-gray-400">
            系统已经拦截这次异常，避免直接出现白屏。你可以先刷新页面；如果异常出现在登录后，建议清除当前登录状态后重新进入。
          </Text>
          <Text className="mt-4 rounded-2xl bg-gray-950 px-4 py-3 text-xs leading-5 text-gray-400">
            {this.state.errorMessage}
          </Text>

          <TouchableOpacity
            onPress={this.handleReload}
            className="mt-5 rounded-2xl bg-red-900 px-4 py-3"
          >
            <Text className="text-center font-medium text-white">刷新页面</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              onPress={this.handleReset}
              className="mt-3 rounded-2xl border border-gray-700 bg-gray-800 px-4 py-3"
            >
              <Text className="text-center font-medium text-white">清除当前登录并重试</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
}

export { AppErrorBoundary };
