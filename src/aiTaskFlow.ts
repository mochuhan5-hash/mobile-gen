import type {
  AIComponentPayload,
  AIInlineComponentType,
  AITask,
  AITaskType,
  CompletedTaskRecord,
  JourneyContext,
  RecommendationData,
  ResumeTaskData,
  TaskCompletionSummary,
} from './types';

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

export function createJourneyContext(): JourneyContext {
  return {
    currentJourneyStage: 'pre_visit',
    activeTaskSnapshot: null,
    completedTasks: [],
    componentUsage: [],
    lastRecommendation: null,
  };
}

export function recordTaskOpen(context: JourneyContext, task: AITask, fromRecommendation: boolean): JourneyContext {
  const step = getInitialTaskStep(task.data);

  return {
    ...context,
    currentJourneyStage: 'in_progress',
    activeTaskSnapshot: {
      type: task.type,
      title: task.title,
      step,
      data: task.data,
      status: 'in_progress',
      lastUpdatedAt: Date.now(),
    },
    componentUsage: [
      {
        componentType: task.type,
        taskType: task.type,
        action: 'open',
        step,
        selection: fromRecommendation ? { source: 'recommendation' } : { source: 'user_input' },
        timestamp: Date.now(),
      },
      ...context.componentUsage,
    ],
  };
}

export function recordTaskStepChange(context: JourneyContext, step: number): JourneyContext {
  if (!context.activeTaskSnapshot) return context;

  return {
    ...context,
    activeTaskSnapshot: {
      ...context.activeTaskSnapshot,
      step,
      lastUpdatedAt: Date.now(),
    },
    componentUsage: [
      {
        componentType: context.activeTaskSnapshot.type,
        taskType: context.activeTaskSnapshot.type,
        action: 'step_change',
        step,
        timestamp: Date.now(),
      },
      ...context.componentUsage,
    ],
  };
}

export function recordTaskSelection(context: JourneyContext, selection: Record<string, unknown>): JourneyContext {
  if (!context.activeTaskSnapshot) return context;

  return {
    ...context,
    activeTaskSnapshot: {
      ...context.activeTaskSnapshot,
      data: {
        ...(context.activeTaskSnapshot.data as Record<string, unknown>),
        lastSelection: selection,
      },
      lastUpdatedAt: Date.now(),
    },
    componentUsage: [
      {
        componentType: context.activeTaskSnapshot.type,
        taskType: context.activeTaskSnapshot.type,
        action: 'select',
        step: context.activeTaskSnapshot.step,
        selection,
        timestamp: Date.now(),
      },
      ...context.componentUsage,
    ],
  };
}

export function recordTaskClose(context: JourneyContext): JourneyContext {
  if (!context.activeTaskSnapshot) return context;

  return {
    ...context,
    componentUsage: [
      {
        componentType: context.activeTaskSnapshot.type,
        taskType: context.activeTaskSnapshot.type,
        action: 'close',
        step: context.activeTaskSnapshot.step,
        timestamp: Date.now(),
      },
      ...context.componentUsage,
    ],
  };
}

export function recordTaskCompletion(context: JourneyContext, task: AITask): JourneyContext {
  const completedTask: CompletedTaskRecord = {
    type: task.type,
    title: task.title,
    status: 'completed',
    timestamp: Date.now(),
  };

  return {
    ...context,
    currentJourneyStage: task.type === 'report' || task.type === 'meds' ? 'post_visit' : 'in_progress',
    activeTaskSnapshot: null,
    completedTasks: [completedTask, ...context.completedTasks],
    componentUsage: [
      {
        componentType: task.type,
        taskType: task.type,
        action: 'complete',
        step: getInitialTaskStep(task.data),
        timestamp: Date.now(),
      },
      ...context.componentUsage,
    ],
  };
}

export function recordRecommendation(context: JourneyContext, recommendation: RecommendationData | null | undefined): JourneyContext {
  if (!recommendation) return context;

  return {
    ...context,
    lastRecommendation: recommendation,
    componentUsage: [
      {
        componentType: recommendation.type,
        taskType: recommendation.type,
        action: 'recommend',
        step: 0,
        selection: { title: recommendation.title, target: recommendation.target },
        timestamp: Date.now(),
      },
      ...context.componentUsage,
    ],
  };
}

export function buildAiContextSummary(context: JourneyContext) {
  return JSON.stringify(context, null, 2);
}

export function buildResumeTaskComponent(context: JourneyContext): { type: 'resume_task'; data: ResumeTaskData } | null {
  const snapshot = context.activeTaskSnapshot;
  if (!snapshot) return null;

  return {
    type: 'resume_task',
    data: {
      title: `继续${snapshot.title}`,
      target: '返回刚才流程',
      task: {
        type: snapshot.type,
        title: snapshot.title,
        data: snapshot.data,
      },
    },
  };
}

export function buildTaskCompletionSummary(_task: AITask): TaskCompletionSummary {
  return {
    title: '你当前的主要事项已完成',
    subtitle: '祝你早日康复',
    primaryActionLabel: '完成并退出',
    notice: '请记得取走您的卡片和票据',
    followUps: [
      {
        label: '查看后续门诊地点',
        icon: 'location',
        targetId: 7,
      },
      {
        label: '打印凭条',
        icon: 'print',
      },
    ],
  };
}
