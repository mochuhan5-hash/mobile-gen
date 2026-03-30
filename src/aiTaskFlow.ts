import type {
  AIComponentPayload,
  AIInlineComponentType,
  AITask,
  AITaskType,
  CompletedTaskRecord,
  JourneyContext,
  Message,
  RecommendationData,
  ResumeTaskData,
  StandardTaskFlow,
  TaskCompletionSummary,
  UserProfile,
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

const STANDARD_TASK_FLOWS: Record<StandardTaskFlow['taskType'], StandardTaskFlow> = {
  appointment: {
    taskType: 'appointment',
    title: '推荐医生挂号缴费',
    steps: [
      { componentType: 'medical', title: 'AI 根据症状推荐科室与医生', allowAiInsertions: true },
      { componentType: 'appointment', title: '展示医生信息并确认挂号', confirmLabel: '确认挂号', allowAiInsertions: true },
      { componentType: 'payment', title: '挂号缴费', confirmLabel: '去缴费' },
    ],
  },
  checkin: {
    taskType: 'checkin',
    title: '签到候诊排队',
    steps: [
      { componentType: 'checkin', title: '展示签到信息并确认签到', confirmLabel: '完成' },
      { componentType: 'process', title: '候诊中与当前叫号切换', confirmLabel: '确认', autoAdvance: true, allowAiInsertions: true },
    ],
  },
  examination: {
    taskType: 'examination',
    title: '检查项目确认并缴费',
    steps: [
      { componentType: 'examination', title: '展示并确认检查项目', confirmLabel: '确认', allowAiInsertions: true },
      { componentType: 'payment', title: '检查缴费', confirmLabel: '去缴费' },
    ],
  },
  report: {
    taskType: 'report',
    title: '检查结果打印及建议复诊',
    steps: [
      { componentType: 'report', title: '展示检查结果与异常项', confirmLabel: '打印检查单并预约复诊', allowAiInsertions: true },
      { componentType: 'appointment', title: '推荐复诊医生方案', confirmLabel: '确认复诊方案', allowAiInsertions: true },
    ],
  },
  meds: {
    taskType: 'meds',
    title: '确认药品清单并药品缴费',
    steps: [
      { componentType: 'meds', title: '展示药品清单并确认', confirmLabel: '去药品缴费', allowAiInsertions: true },
      { componentType: 'payment', title: '药品缴费', confirmLabel: '去缴费' },
    ],
  },
};

export function getTaskTitle(type: AITaskType) {
  return TASK_TITLES[type] || '服务详情';
}

export function getStandardTaskFlow(taskType: StandardTaskFlow['taskType']) {
  return STANDARD_TASK_FLOWS[taskType] ?? null;
}

export function normalizeTaskForFlow(task: AITask): AITask {
  if (task.type === 'medical' || task.type === 'appointment') {
    return {
      type: 'appointment',
      title: STANDARD_TASK_FLOWS.appointment.title,
      data: task.data,
    };
  }

  if (task.type === 'checkin') {
    return {
      type: 'checkin',
      title: STANDARD_TASK_FLOWS.checkin.title,
      data: task.data,
    };
  }

  if (task.type === 'examination' || task.type === 'payment') {
    return {
      type: 'examination',
      title: STANDARD_TASK_FLOWS.examination.title,
      data: task.data,
    };
  }

  if (task.type === 'report') {
    return {
      type: 'report',
      title: STANDARD_TASK_FLOWS.report.title,
      data: task.data,
    };
  }

  if (task.type === 'meds') {
    return {
      type: 'meds',
      title: STANDARD_TASK_FLOWS.meds.title,
      data: task.data,
    };
  }

  return task;
}

export function buildTaskStepTask(task: AITask, stepIndex: number): AITask | null {
  const flow = getStandardTaskFlow(task.type as StandardTaskFlow['taskType']);
  const step = flow?.steps[stepIndex];
  if (!flow || !step) return null;

  const baseData = (task.data && typeof task.data === 'object') ? task.data as Record<string, unknown> : {};
  const metadata = {
    __standardFlowTaskType: task.type,
    __standardFlowTaskTitle: task.title,
    __standardFlowStepIndex: stepIndex,
    __standardFlowActionLabel: step.confirmLabel,
  };

  let stepData: Record<string, unknown> = { ...baseData, ...metadata };

  if (task.type === 'appointment' && step.componentType === 'medical') {
    stepData = {
      symptoms: (baseData.symptoms as string[] | undefined) ?? ['咳嗽', '胸闷'],
      recommendation: (baseData.recommendation as string | undefined) ?? (baseData.department as string | undefined) ?? '呼吸内科',
      confidence: (baseData.confidence as number | undefined) ?? 0.92,
      ...metadata,
    };
  }

  if (task.type === 'appointment' && step.componentType === 'appointment') {
    stepData = {
      department: (baseData.department as string | undefined) ?? (baseData.recommendation as string | undefined) ?? '呼吸内科',
      doctors: (baseData.doctors as unknown[] | undefined) ?? [
        { name: '王主任', time: '今日 14:00', fee: '¥50', specialty: '慢性咳嗽、哮喘', queue: '约 12 分钟', location: '2 号诊室' },
        { name: '李医生', time: '今日 15:30', fee: '¥20', specialty: '呼吸道感染', queue: '约 8 分钟', location: '3 号诊室' },
      ],
      ...metadata,
    };
  }

  if (task.type === 'appointment' && step.componentType === 'payment') {
    const lastSelection = (baseData.lastSelection && typeof baseData.lastSelection === 'object')
      ? baseData.lastSelection as Record<string, unknown>
      : {};
    const selectedDoctorName = (lastSelection.doctorName as string | undefined) ?? '王主任';
    const selectedDoctorFee = Number(String((lastSelection.fee as string | number | undefined) ?? '50').replace(/[^\d.]/g, '')) || 50;
    const selectedDepartment = (baseData.department as string | undefined) ?? '呼吸内科';

    stepData = {
      lineItems: [
        {
          name: `${selectedDepartment}挂号费（${selectedDoctorName}）`,
          price: selectedDoctorFee,
        },
      ],
      total: selectedDoctorFee,
      statusLabel: '待支付',
      ...baseData,
      ...metadata,
    };
  }

  if (task.type === 'checkin' && step.componentType === 'checkin') {
    stepData = {
      department: (baseData.department as string | undefined) ?? '呼吸内科门诊',
      location: (baseData.location as string | undefined) ?? '门诊楼 3 层 A 区',
      visitTime: (baseData.visitTime as string | undefined) ?? '10:30 - 11:00',
      deadline: (baseData.deadline as string | undefined) ?? '请在 10:45 前完成签到',
      ...baseData,
      ...metadata,
    };
  }

  if (task.type === 'checkin' && step.componentType === 'process') {
    stepData = {
      steps: ['签到成功', '候诊中', '当前叫号'],
      currentStep: 1,
      ...baseData,
      ...metadata,
    };
  }

  if (task.type === 'examination' && step.componentType === 'payment') {
    const items = Array.isArray(baseData.items) ? baseData.items as Array<Record<string, unknown>> : [
      { name: '血常规检查', price: 45 },
      { name: '胸部 X 光', price: 120 },
    ];
    const lineItems = items.map((item) => ({
      name: String(item.name ?? '检查项目'),
      price: Number(item.price ?? 0),
    }));
    const total = lineItems.reduce((sum, item) => sum + item.price, 0);

    stepData = {
      lineItems,
      total,
      statusLabel: '待支付',
      ...baseData,
      ...metadata,
    };
  }

  if (task.type === 'report' && step.componentType === 'appointment') {
    stepData = {
      department: '复诊推荐',
      doctors: [
        { name: '原接诊医生', time: '明日 09:30', fee: '¥0', specialty: '轻度异常优先复诊', queue: '约 6 分钟', location: '呼吸内科 2 诊室' },
        { name: '专家门诊', time: '今日 16:00', fee: '¥80', specialty: '异常重优先专家复诊', queue: '约 18 分钟', location: '专家门诊 1 诊室' },
      ],
      ...metadata,
    };
  }

  if (task.type === 'meds' && step.componentType === 'payment') {
    const medicineItems = Array.isArray(baseData.medicineItems) ? baseData.medicineItems as Array<Record<string, unknown>> : [
      { name: '阿莫西林胶囊', price: 32.5 },
      { name: '复方甘草口服液', price: 12.5 },
    ];
    const lineItems = medicineItems.map((item) => ({
      name: String(item.name ?? '药品'),
      price: Number(item.price ?? 0),
    }));
    const total = lineItems.reduce((sum, item) => sum + item.price, 0);

    stepData = {
      lineItems,
      total,
      statusLabel: '待支付',
      ...baseData,
      ...metadata,
    };
  }

  return {
    type: step.componentType as AITaskType,
    title: step.title,
    data: stepData,
  };
}

export function createTaskFromComponent(component: AIComponentPayload<AIInlineComponentType>): AITask {
  return normalizeTaskForFlow({
    type: component.type as AITaskType,
    data: component.data,
    title: getTaskTitle(component.type as AITaskType),
  });
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

export function upsertResumeTaskMessage(messages: Message[], nextMessage: Message): Message[] {
  const filteredMessages = messages.filter((message: Message) => message.component?.type !== 'resume_task');
  return [...filteredMessages, nextMessage];
}

export function buildTaskCompletionSummary(_task: AITask): TaskCompletionSummary {
  return {
    title: '你当前的主要事项已完成',
    subtitle: '祝你早日康复',
    primaryActionLabel: '完成并退出',
    notice: '请记得取走您的卡片和票据',
  };
}

export function buildUserProfileSummary(
  userProfile: UserProfile,
  history: Array<{ id: string; type: string; title: string; status: 'completed' | 'pending'; timestamp: number }>,
  journeyContext: JourneyContext,
) {
  return JSON.stringify({
    userProfile,
    recentTaskHistory: history,
    currentJourneyContext: journeyContext,
  }, null, 2);
}
