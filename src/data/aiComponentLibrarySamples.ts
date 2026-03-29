import type { AIComponentPayload, AIMessageComponentType, AITask, TaskCompletionSummary } from '../types';

export const messageCardSamples: Array<{ title: string; component: AIComponentPayload<AIMessageComponentType> }> = [
  {
    title: '分诊建议',
    component: {
      type: 'medical',
      data: {
        symptoms: ['咳嗽', '低烧', '胸闷'],
        recommendation: '呼吸内科',
        confidence: 0.92,
      },
    },
  },
  {
    title: '流程指引',
    component: {
      type: 'process',
      data: {
        steps: ['到签到机刷卡', '确认门诊信息', '在候诊区等候叫号'],
        currentStep: 1,
      },
    },
  },
  {
    title: '位置导航',
    component: {
      type: 'location',
      data: {
        destination: '门诊楼 2 层检验科',
        floor: '2 层',
        direction: '电梯右转直行 30 米',
      },
    },
  },
  {
    title: '温馨提示',
    component: {
      type: 'tip',
      data: {
        level: 'warning',
        title: '检查前准备',
        content: '腹部超声检查前请保持空腹，避免影响检查结果。',
      },
    },
  },
  {
    title: '下一步推荐',
    component: {
      type: 'recommendation',
      data: {
        type: 'checkin',
        title: '前往签到候诊',
        target: '呼吸内科门诊',
      },
    },
  },
];

export const taskCompletionSamples: Array<{ title: string; summary: TaskCompletionSummary }> = [
  {
    title: '任务完成态',
    summary: {
      title: '你当前的主要事项已完成',
      subtitle: '祝你早日康复',
      primaryActionLabel: '完成并退出',
      notice: '请记得取走您的卡片和票据',
      followUps: [
        { label: '查看后续门诊地点', icon: 'location', targetId: 7 },
        { label: '打印凭条', icon: 'print' },
      ],
    },
  },
];

export const taskPanelSamples: Array<{ title: string; task: AITask; taskStep?: number }> = [
  {
    title: '预约挂号',
    task: {
      type: 'appointment',
      title: '预约挂号',
      data: {
        department: '呼吸内科',
        doctors: [
          { name: '王主任', time: '14:00', fee: '¥50' },
          { name: '李医生', time: '15:30', fee: '¥20' },
        ],
      },
    },
  },
  {
    title: '签到候诊',
    task: {
      type: 'checkin',
      title: '签到候诊',
      data: {
        callingNumber: 'A042',
        aheadCount: 5,
        waitMinutes: 15,
        department: '呼吸内科门诊',
      },
    },
  },
  {
    title: '诊后缴费',
    task: {
      type: 'payment',
      title: '费用结算',
      data: {
        lineItems: [
          { name: '血常规(五分类)', price: 45 },
          { name: '胸部正侧位 X线', price: 120 },
          { name: '阿莫西林胶囊', price: 32.5 },
        ],
        total: 197.5,
        statusLabel: '待支付',
      },
    },
  },
  {
    title: '完成检查',
    task: {
      type: 'examination',
      title: '完成检查',
      data: {
        departmentLabel: '检验科（2楼）',
        items: [
          { name: '血常规(五分类)', status: 'completed' },
          { name: '阿莫西林胶囊', status: 'pending' },
        ],
      },
    },
  },
  {
    title: '报告查询',
    task: {
      type: 'report',
      title: '报告查询与打印',
      data: {},
    },
  },
  {
    title: '支付取药',
    task: {
      type: 'meds',
      title: '支付与取药',
      data: {
        total: 45,
        pickupWindow: '3号 门诊药房',
        pickupCode: '28',
        medicineItems: [
          { name: '阿莫西林胶囊（0.25g*24粒）', price: 32.5 },
          { name: '复方甘草口服液（100ml）', price: 12.5 },
        ],
      },
    },
  },
  {
    title: '智能分诊',
    task: {
      type: 'medical',
      title: '分诊建议',
      data: {
        symptoms: ['咳嗽', '低烧', '胸闷'],
        recommendation: '呼吸内科',
        confidence: 0.92,
      },
    },
  },
  {
    title: '流程任务',
    taskStep: 1,
    task: {
      type: 'process',
      title: '操作指引',
      data: {
        steps: ['到签到机刷卡', '确认门诊信息', '在候诊区等候叫号'],
        currentStep: 1,
      },
    },
  },
  {
    title: '位置任务',
    task: {
      type: 'location',
      title: '位置导航',
      data: {
        destination: '门诊楼 2 层检验科',
        floor: '2 层',
        direction: '电梯右转直行 30 米',
      },
    },
  },
  {
    title: '提示任务',
    task: {
      type: 'tip',
      title: '温馨提示',
      data: {
        level: 'info',
        title: '请携带证件',
        content: '办理签到和缴费时，请提前准备好身份证和就诊卡。',
      },
    },
  },
];
