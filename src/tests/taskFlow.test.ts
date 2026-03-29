import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAiContextSummary,
  buildResumeTaskComponent,
  buildTaskCompletionSummary,
  buildUserProfileSummary,
  createJourneyContext,
  createTaskFromComponent,
  getInitialTaskStep,
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
  assert.equal(task.title, '预约挂号');
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
  assert.equal(result.activeTask?.title, '预约挂号');
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
  assert.equal(resumeComponent?.data.title, '继续预约挂号');
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

test('task completion summary should expose default completion screen copy', () => {
  const summary = buildTaskCompletionSummary({
    type: 'appointment',
    title: '预约挂号',
    data: {},
  });

  assert.equal(summary.title, '你当前的主要事项已完成');
  assert.equal(summary.subtitle, '祝你早日康复');
  assert.equal(summary.primaryActionLabel, '完成并退出');
  assert.equal(summary.notice, '请记得取走您的卡片和票据');
  assert.equal(summary.followUps.length, 2);
  assert.equal(summary.followUps[0]?.label, '查看后续门诊地点');
  assert.equal(summary.followUps[1]?.label, '打印凭条');
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
