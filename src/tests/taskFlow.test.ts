import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAiContextSummary,
  createJourneyContext,
  createTaskFromComponent,
  getInitialTaskStep,
  buildExitRecommendationPrompt,
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
}

interface MockMessage {
  role: 'model';
  text: string;
  component?: MockResponseData['component'];
}

function applyAiResponse(responseData: MockResponseData, options?: { autoOpenTask?: boolean }) {
  let activeTask = null;
  let taskStep = -1;
  let message: MockMessage | null = null;

  message = {
    role: 'model',
    text: 'mock',
    component: responseData.component ?? undefined,
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

test('exiting a task should build background recommendation prompt with nested context', () => {
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

  const prompt = buildExitRecommendationPrompt(context, openedTask.title);
  assert.match(prompt, /我刚刚中途中断了预约挂号/);
  assert.match(prompt, /当前就诊上下文/);
  assert.match(prompt, /王主任/);
  assert.match(prompt, /recommendation/);
  assert.match(prompt, /推荐卡片/);
  assert.match(prompt, /不要自动开始任务/);
});
