import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAiContextSummary,
  buildResumeTaskComponent,
  upsertResumeTaskMessage,
  buildTaskCompletionSummary,
  buildTaskStepTask,
  buildUserProfileSummary,
  createJourneyContext,
  createTaskFromComponent,
  getInitialTaskStep,
  getStandardTaskFlow,
  normalizeTaskForFlow,
  recordTaskClose,
  recordTaskCompletion,
  recordTaskOpen,
  recordTaskSelection,
  recordTaskStepChange,
} from '../aiTaskFlow.ts';

interface MockResponseData {
  component?: {
    type: 'medical' | 'appointment' | 'checkin' | 'payment' | 'report' | 'meds' | 'examination' | 'process' | 'location' | 'tip';
    data: Record<string, unknown> & { currentStep?: number };
  } | null;
  recommendation?: {
    type: 'checkin' | 'payment' | 'report' | 'meds' | 'examination';
    title: string;
    target: string;
  } | null;
}

interface MockMessage {
  role: 'model';
  text: string;
  component?: MockResponseData['component'];
  recommendation?: MockResponseData['recommendation'];
}

function applyAiResponse(responseData: MockResponseData, options?: { autoOpenTask?: boolean }) {
  let activeTask = null;
  let taskStep = -1;
  let message: MockMessage | null = null;

  message = {
    role: 'model',
    text: 'mock',
    component: responseData.component ?? undefined,
    recommendation: responseData.recommendation ?? undefined,
  };

  if (responseData.component && (options?.autoOpenTask ?? true)) {
    activeTask = createTaskFromComponent(responseData.component);
    taskStep = getInitialTaskStep(responseData.component.data);
  }

  return { message, activeTask, taskStep };
}

test('AI recommendation-only flow should not auto-open task card', () => {
  const result = applyAiResponse({
    component: {
      type: 'appointment',
      data: { department: '呼吸内科' },
    },
  }, {
    autoOpenTask: false,
  });

  assert.equal(result.message?.component?.type, 'appointment');
  assert.equal(result.activeTask, null);
});

test('task factory should create task only when user manually opens it', () => {
  const task = createTaskFromComponent({
    type: 'appointment',
    data: { department: '呼吸内科' },
  });

  assert.equal(task.type, 'appointment');
  assert.equal(task.title, '推荐医生挂号缴费');
  assert.deepEqual(task.data, { department: '呼吸内科' });
  assert.equal(getInitialTaskStep({ currentStep: 2 }), 2);
});

test('user-initiated request should still auto-open current task card', () => {
  const result = applyAiResponse({
    component: {
      type: 'appointment',
      data: { department: '呼吸内科', currentStep: 1 },
    },
  });

  assert.equal(result.activeTask?.type, 'appointment');
  assert.equal(result.activeTask?.title, '推荐医生挂号缴费');
  assert.equal(result.taskStep, 1);
});

test('journey context should track open, step change, selection and completion as JSON summary', () => {
  const openedTask = createTaskFromComponent({
    type: 'appointment',
    data: { department: '呼吸内科' },
  });

  let context = createJourneyContext();
  context = recordTaskOpen(context, openedTask, false);
  context = recordTaskStepChange(context, 1);
  context = recordTaskSelection(context, {
    doctorName: '王主任',
    time: '14:00',
    fee: '¥50',
  });
  context = recordTaskCompletion(context, openedTask);

  assert.equal(context.activeTaskSnapshot, null);
  assert.equal(context.completedTasks.length, 1);
  assert.equal(context.completedTasks[0]?.type, 'appointment');
  assert.equal(context.componentUsage.length, 4);
  assert.equal(context.componentUsage[0]?.action, 'complete');
  assert.equal(context.componentUsage[1]?.action, 'select');
  assert.deepEqual(context.componentUsage[1]?.selection, {
    doctorName: '王主任',
    time: '14:00',
    fee: '¥50',
  });
  assert.equal(context.componentUsage[2]?.action, 'step_change');
  assert.equal(context.componentUsage[3]?.action, 'open');

  const summary = buildAiContextSummary(context);
  assert.match(summary, /appointment/);
  assert.match(summary, /doctorName/);
  assert.match(summary, /王主任/);
  assert.match(summary, /completedTasks/);
});

test('exiting a task should build dedicated resume-task component payload', () => {
  const openedTask = createTaskFromComponent({
    type: 'appointment',
    data: { department: '呼吸内科' },
  });

  let context = createJourneyContext();
  context = recordTaskOpen(context, openedTask, false);
  context = recordTaskSelection(context, {
    doctorName: '王主任',
    time: '14:00',
  });
  context = recordTaskClose(context);

  const resumeComponent = buildResumeTaskComponent(context);
  assert.equal(resumeComponent?.type, 'resume_task');
  assert.equal(resumeComponent?.data.title, '继续推荐医生挂号缴费');
  assert.equal(resumeComponent?.data.target, '返回刚才流程');
  assert.equal(resumeComponent?.data.task.type, 'appointment');
  assert.equal((resumeComponent?.data.task.data as Record<string, unknown>).department, '呼吸内科');
});

test('completion flow should preserve recommendation payload in model message', () => {
  const result = applyAiResponse({
    recommendation: {
      type: 'checkin',
      title: '前往签到',
      target: '呼吸内科',
    },
  }, {
    autoOpenTask: false,
  });

  assert.equal(result.message?.recommendation?.type, 'checkin');
  assert.equal(result.message?.recommendation?.title, '前往签到');
  assert.equal(result.activeTask, null);
});

test('upsertResumeTaskMessage should keep only one latest resume-task message', () => {
  const first = buildResumeTaskComponent(recordTaskClose(recordTaskOpen(createJourneyContext(), createTaskFromComponent({
    type: 'appointment',
    data: { department: '呼吸内科' },
  }), false)));
  const second = buildResumeTaskComponent(recordTaskClose(recordTaskOpen(createJourneyContext(), createTaskFromComponent({
    type: 'checkin',
    data: { department: '呼吸内科门诊' },
  }), false)));

  const messages = upsertResumeTaskMessage([
    { role: 'model', text: '旧消息' },
    { role: 'model', text: '您已中断当前任务，可随时继续推荐医生挂号缴费。', component: first ?? undefined },
  ], {
    role: 'model',
    text: '您已中断当前任务，可随时继续签到候诊排队。',
    component: second ?? undefined,
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.text, '旧消息');
  assert.equal(messages[1]?.text, '您已中断当前任务，可随时继续签到候诊排队。');
  assert.equal(messages[1]?.component?.type, 'resume_task');
  assert.equal(messages.filter((message) => message.component?.type === 'resume_task').length, 1);
});

test('task completion summary should expose default completion screen copy without follow-up suggestions', () => {
  const summary = buildTaskCompletionSummary({
    type: 'appointment',
    title: '预约挂号',
    data: {},
  });

  assert.equal(summary.title, '你当前的主要事项已完成');
  assert.equal(summary.subtitle, '祝你早日康复');
  assert.equal(summary.primaryActionLabel, '完成并退出');
  assert.equal(summary.notice, '请记得取走您的卡片和票据');
  assert.ok(!('followUps' in summary));
});

test('user profile summary should include profile, visit history and journey context', () => {
  const context = createJourneyContext();
  const summary = buildUserProfileSummary({
    basicInfo: {
      name: '张三',
      age: 34,
      gender: '男',
      phone: '13800000000',
    },
    healthProfile: {
      allergies: '青霉素',
      chronicConditions: '哮喘',
      notes: '近期夜间咳嗽频繁',
    },
    visitRecords: [
      {
        id: 'visit-1',
        date: '2026-03-10',
        department: '呼吸内科',
        complaint: '咳嗽两周',
        diagnosis: '上呼吸道感染',
        treatment: '开药观察',
      },
    ],
  }, [
    {
      id: 'task-1',
      type: 'checkin',
      title: '签到候诊',
      status: 'completed',
      timestamp: 1710000000000,
    },
  ], context);

  assert.match(summary, /张三/);
  assert.match(summary, /青霉素/);
  assert.match(summary, /呼吸内科/);
  assert.match(summary, /签到候诊/);
  assert.match(summary, /currentJourneyStage/);
});

test('normalizeTaskForFlow should map standard medical entry components to fixed flow tasks', () => {
  const normalizedMedical = normalizeTaskForFlow({
    type: 'medical',
    title: '智能分诊',
    data: { recommendation: '呼吸内科', confidence: 0.9 },
  });
  const normalizedReport = normalizeTaskForFlow({
    type: 'report',
    title: '报告查询',
    data: {},
  });

  assert.equal(normalizedMedical.type, 'appointment');
  assert.equal(normalizedMedical.title, '推荐医生挂号缴费');
  assert.equal(normalizedReport.type, 'report');
  assert.equal(normalizedReport.title, '检查结果打印及建议复诊');
});

test('getStandardTaskFlow should return configurable skeleton for standard medical tasks without tip steps', () => {
  const appointmentFlow = getStandardTaskFlow('appointment');
  const checkinFlow = getStandardTaskFlow('checkin');
  const examinationFlow = getStandardTaskFlow('examination');
  const medsFlow = getStandardTaskFlow('meds');

  assert.ok(appointmentFlow);
  assert.equal(appointmentFlow?.taskType, 'appointment');
  assert.deepEqual(appointmentFlow?.steps.map((step: { componentType: string }) => step.componentType), ['medical', 'appointment', 'payment']);
  assert.deepEqual(checkinFlow?.steps.map((step: { componentType: string }) => step.componentType), ['checkin', 'process']);
  assert.deepEqual(examinationFlow?.steps.map((step: { componentType: string }) => step.componentType), ['examination', 'payment']);
  assert.deepEqual(medsFlow?.steps.map((step: { componentType: string }) => step.componentType), ['meds', 'payment']);
  assert.equal(appointmentFlow?.steps[1]?.confirmLabel, '确认挂号');
  assert.equal(appointmentFlow?.steps[2]?.confirmLabel, '去缴费');
});

test('buildTaskStepTask should build current step component task from standard flow', () => {
  const task = buildTaskStepTask({
    type: 'appointment',
    title: '推荐医生挂号缴费',
    data: { department: '呼吸内科', recommendation: '呼吸内科', confidence: 0.9 },
  }, 1);

  assert.equal(task?.type, 'appointment');
  assert.equal(task?.title, '展示医生信息并确认挂号');
  assert.equal((task?.data as Record<string, unknown>).department, '呼吸内科');
});

test('buildTaskStepTask should switch standard flow appointment to payment step task', () => {
  const task = buildTaskStepTask({
    type: 'appointment',
    title: '推荐医生挂号缴费',
    data: {
      department: '呼吸内科',
      lastSelection: {
        doctorName: '王主任',
        time: '今日 14:00',
        fee: '¥50',
        location: '2 号诊室',
      },
    },
  }, 2);

  assert.equal(task?.type, 'payment');
  assert.equal(task?.title, '挂号缴费');
  assert.equal((task?.data as Record<string, unknown>).__standardFlowStepIndex, 2);
  assert.equal((task?.data as Record<string, unknown>).__standardFlowTaskType, 'appointment');
  assert.deepEqual((task?.data as Record<string, unknown>).lineItems, [
    { name: '呼吸内科挂号费（王主任）', price: 50 },
  ]);
  assert.equal((task?.data as Record<string, unknown>).total, 50);
});

test('buildTaskStepTask should build checkin step with location and department info', () => {
  const task = buildTaskStepTask({
    type: 'checkin',
    title: '签到候诊排队',
    data: {
      department: '呼吸内科门诊',
      location: '门诊楼 3 层 A 区',
      visitTime: '10:30 - 11:00',
      deadline: '请在 10:45 前完成签到',
    },
  }, 0);

  assert.equal(task?.type, 'checkin');
  assert.equal(task?.title, '展示签到信息并确认签到');
  assert.equal((task?.data as Record<string, unknown>).department, '呼吸内科门诊');
  assert.equal((task?.data as Record<string, unknown>).location, '门诊楼 3 层 A 区');
  assert.equal((task?.data as Record<string, unknown>).visitTime, '10:30 - 11:00');
  assert.equal((task?.data as Record<string, unknown>).deadline, '请在 10:45 前完成签到');
});
