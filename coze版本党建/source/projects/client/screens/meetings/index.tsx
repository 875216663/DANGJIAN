import React from 'react';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

export default function Meetings() {
  return (
    <FeatureComingSoon
      title="三会一课"
      description="当前交付版优先保障党员信息管理和党支部管理稳定可用，会议治理模块将在下一阶段接入。"
      highlights={[
        '会议计划、纪要录入与参会统计',
        '按支部查看历史组织生活记录',
        '会议提醒与执行状态跟踪',
      ]}
    />
  );
}
