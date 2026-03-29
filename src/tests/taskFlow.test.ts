import test from 'node:test';
import assert from 'node:assert/strict';

import { createTaskFromComponent, getInitialTaskStep } from '../aiTaskFlow.ts';

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
