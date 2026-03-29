import type { AIComponentPayload, AIInlineComponentType, AITask, AITaskType } from './types';

const TASK_TITLES: Record<AITaskType, string> = {
  appointment: '预约挂号',
  checkin: '签到候诊',
  payment: '费用结算',
  examination: '完成检查',
  report: '报告查询',
  meds: '支付取药',
  medical: '智能分诊',
  process: '流程指引',
  location: '位置导航',
  tip: '温馨提示',
};

export function getTaskTitle(type: AITaskType) {
  return TASK_TITLES[type] || '服务详情';
}

export function createTaskFromComponent(component: AIComponentPayload<AIInlineComponentType>): AITask {
  return {
    type: component.type as AITaskType,
    data: component.data,
    title: getTaskTitle(component.type as AITaskType),
  };
}

export function getInitialTaskStep(data: unknown) {
  if (!data || typeof data !== 'object') return 0;

  const currentStep = (data as { currentStep?: unknown }).currentStep;
  return typeof currentStep === 'number' ? currentStep : 0;
}
