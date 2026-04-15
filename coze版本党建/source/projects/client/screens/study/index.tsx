import React from 'react';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

export default function Study() {
  return (
    <FeatureComingSoon
      title="学习教育"
      description="学习资料中心暂未纳入当前正式交付范围，后续会结合更稳定的文件存储方案一并开放。"
      highlights={[
        '资料上传、下载与长期存储',
        '学习记录统计与完成度分析',
        '按专题组织学习材料归档',
      ]}
    />
  );
}
