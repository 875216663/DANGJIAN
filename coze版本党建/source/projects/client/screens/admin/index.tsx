import React from 'react';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

export default function Admin() {
  return (
    <FeatureComingSoon
      title="系统管理"
      description="系统管理模块暂不作为当前交付范围的一部分，后续会根据实际使用情况再补充开放。"
      highlights={[
        '角色权限与组织范围控制',
        '操作日志与系统配置',
        '更多高级治理与统计能力',
      ]}
    />
  );
}
