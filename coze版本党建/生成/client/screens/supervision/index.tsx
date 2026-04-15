import React from 'react';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

export default function Supervision() {
  return (
    <FeatureComingSoon
      title="纪检监督"
      description="纪检监督模块会在党员与支部基础信息稳定运行后再逐步开放，当前版本暂不对外启用。"
      highlights={[
        '预警提醒与风险台账',
        '整改跟踪与责任闭环',
        '重点任务监督看板',
      ]}
    />
  );
}
