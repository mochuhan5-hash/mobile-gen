import type {
  AIComponentPayload,
  AIInlineComponentType,
  AITask,
  AITaskType,
  CompletedTaskRecord,
  JourneyContext,
  RecommendationData,
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

export function buildExitRecommendationPrompt(context: JourneyContext, title: string) {
  return `我刚刚中途中断了${title}，请基于下面的当前就诊上下文，推荐我现在最适合继续的下一个任务。请务必返回 recommendation 推荐卡片，而不只是文字说明；如果适合继续当前中断流程，也请用 recommendation 表达。不要自动开始任务。\n\n当前就诊上下文(JSON)：\n${buildAiContextSummary(context)}`;
}
