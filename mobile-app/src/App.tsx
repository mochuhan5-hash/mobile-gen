/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OpenAI from 'openai';
import {
  Calendar,
  HelpCircle,
  CheckCircle2,
  CreditCard,
  ClipboardCheck,
  FileText,
  MapPin,
  AlertCircle,
  UserPlus,
  History,
  ArrowRight,
  Printer,
  Navigation,
  PhoneCall,
  RotateCcw,
  Clock,
  Info,
  ChevronRight,
  User,
  Stethoscope,
  MessageSquare,
  Search,
  Send,
  Bot,
  User as UserIcon,
  Loader2,
} from 'lucide-react';
import TopTabs from './components/navigation/TopTabs';
import AIMessageRenderer from './components/ai/AIMessageRenderer';
import AITaskCompletionCard from './components/ai/AITaskCompletionCard';
import AITaskRenderer from './components/ai/AITaskRenderer';
import AIComponentLibraryPage from './pages/AIComponentLibraryPage';
import UserProfilePage from './pages/UserProfilePage';
import {
  buildAiContextSummary,
  buildResumeTaskComponent,
  buildTaskCompletionSummary,
  buildTaskStepTask,
  buildUserProfileSummary,
  createJourneyContext,
  getInitialTaskStep,
  getStandardTaskFlow,
  normalizeTaskForFlow,
  recordRecommendation,
  recordTaskClose,
  recordTaskCompletion,
  recordTaskOpen,
  recordTaskSelection,
  recordTaskStepChange,
} from './aiTaskFlow';
import { SCENARIOS, type AppView, type AITask, type JourneyContext, type Message, type RecommendationData, type TaskCompletionSummary, type UserProfile, type VisitRecord, ScenarioId } from './types';

const DEFAULT_OPENAI_BASE_URL = 'http://143.198.222.179:8317/v1';

function getOpenAiBaseURL(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/openai-v1`;
  }
  return process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL;
}

// Initialize OpenAI client (dev: same-origin proxy in vite.config to avoid CORS)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: getOpenAiBaseURL(),
  dangerouslyAllowBrowser: true,
});

interface TaskRecord {
  id: string;
  type: string;
  title: string;
  status: 'completed' | 'pending';
  timestamp: number;
}

type KioskStagePayload = {
  statusCode: 1 | 2 | 3 | 4 | 5;
  nextStage?: 1 | 2 | 3 | 4 | 5;
  symptom?: string;
  department?: string;
  selectedDoctor?: string;
  source?: string;
  ts?: number;
};

/**
 * 一体机状态码映射为手机端可读文案与推荐任务。
 */
function mapKioskCompletionToMessage(payload: KioskStagePayload): {
  completedTitle: string;
  recommendation: RecommendationData | null;
} {
  const department = payload.department || '对应科室';
  const stage = payload.statusCode;
  if (stage === 1) {
    return {
      completedTitle: '推荐医生挂号缴费',
      recommendation: {
        type: 'checkin',
        title: '开启下一步：签到候诊排队',
        target: `${department}签到台`,
      },
    };
  }
  if (stage === 2) {
    return {
      completedTitle: '签到候诊排队',
      recommendation: {
        type: 'examination',
        title: '开启下一步：检查项目确认并缴费',
        target: `${department}检查流程`,
      },
    };
  }
  if (stage === 3) {
    return {
      completedTitle: '检查项目确认并缴费',
      recommendation: {
        type: 'report',
        title: '开启下一步：检查结果打印并复诊',
        target: '检查结果页',
      },
    };
  }
  if (stage === 4) {
    return {
      completedTitle: '检查结果打印并复诊',
      recommendation: {
        type: 'meds',
        title: '开启下一步：确认药品清单并药品缴费',
        target: '药品缴费流程',
      },
    };
  }
  return {
    completedTitle: '确认药品清单并药品缴费',
    recommendation: null,
  };
}

const defaultUserProfile: UserProfile = {
  basicInfo: {
    name: '张三',
    age: 34,
    gender: '男',
    phone: '13800000000',
  },
  healthProfile: {
    allergies: '青霉素过敏',
    chronicConditions: '轻度哮喘',
    notes: '近半年反复咳嗽，换季时更明显。',
  },
  visitRecords: [
    {
      id: 'visit-1',
      date: '2026-03-10',
      department: '呼吸内科',
      complaint: '咳嗽两周',
      diagnosis: '上呼吸道感染',
      treatment: '开具止咳药并建议复查',
    },
    {
      id: 'visit-2',
      date: '2026-01-18',
      department: '全科门诊',
      complaint: '夜间胸闷',
      diagnosis: '哮喘随访',
      treatment: '调整吸入药物剂量',
    },
  ],
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('business');
  const [currentId, setCurrentId] = useState<ScenarioId>(1);
  const [hasIdentity, setHasIdentity] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [medicalRequirement, setMedicalRequirement] = useState<string>('');
  const [activeTask, setActiveTask] = useState<AITask | null>(null);
  const [taskStep, setTaskStep] = useState(0);
  const [history, setHistory] = useState<TaskRecord[]>([]);
  const [journeyContext, setJourneyContext] = useState<JourneyContext>(() => createJourneyContext());
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile);
  const [taskCompletionSummary, setTaskCompletionSummary] = useState<TaskCompletionSummary | null>(null);
  const [pendingCompletionRecommendation, setPendingCompletionRecommendation] = useState<RecommendationData | null>(null);

  // AI Chat State
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '您好！我是医院问诊台咨询员。您可以向我咨询：\n1. 症状分诊（如：肚子疼挂什么科）\n2. 流程指引（如：如何取药）\n3. 位置导航（如：抽血室在哪）\n4. 紧急求助（如：感觉头晕不舒服）' }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const latestKioskTsRef = useRef(0);

  /**
   * 将手机端用户档案同步到本地 API，供一体机首页读取。
   */
  const syncUserProfileToLocalApi = async (profile: UserProfile) => {
    try {
      const latestComplaint = profile.visitRecords[0]?.complaint ?? "";
      const payload = {
        basicInfo: profile.basicInfo,
        healthProfile: profile.healthProfile,
        visitRecords: profile.visitRecords,
        symptomHint: latestComplaint || profile.healthProfile.notes || "",
        updatedAt: Date.now(),
      };
      await fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // 同步失败不影响手机端主流程。
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    void syncUserProfileToLocalApi(userProfile);
  }, [userProfile]);

  /**
   * 轮询手机端本地接口，接收一体机完成状态并弹出 AI 对话。
   */
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const resp = await fetch('/api/kiosk-stage', { method: 'GET' });
        const data = await resp.json() as { ok?: boolean; data?: KioskStagePayload | null };
        const payload = data?.data;
        if (!payload || cancelled) return;
        const ts = Number(payload.ts ?? 0);
        if (!Number.isFinite(ts) || ts <= latestKioskTsRef.current) return;
        latestKioskTsRef.current = ts;

        const mapped = mapKioskCompletionToMessage(payload);
        const text = `“${mapped.completedTitle}”已完成。请查看下方推荐，并手动开启下一步任务。`;

        const modelMessage: Message = {
          role: 'model',
          text,
          recommendation: mapped.recommendation ?? undefined,
        };

        // 强制切回业务视图聊天区，确保用户能看到 AI 弹出的流程提示。
        setActiveView('business');
        setCurrentId(1);
        setHasIdentity(false);
        setActiveTask(null);
        setTaskStep(0);
        setTaskCompletionSummary(null);
        setPendingCompletionRecommendation(mapped.recommendation);
        setMessages((prev: Message[]) => [...prev, modelMessage]);
        setJourneyContext((prev: JourneyContext) => recordRecommendation(prev, mapped.recommendation));
      } catch {
        // 忽略临时网络波动，不影响主流程。
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const handleTaskOpen = (task: AITask, fromRecommendation = false) => {
    const normalizedTask = normalizeTaskForFlow(task);

    setTaskCompletionSummary(null);
    setPendingCompletionRecommendation(null);
    if (normalizedTask.type !== 'appointment') {
      setMedicalRequirement('');
    }
    setActiveTask(normalizedTask);
    setTaskStep(getInitialTaskStep(normalizedTask.data));
    setJourneyContext((prev: JourneyContext) => recordTaskOpen(prev, normalizedTask, fromRecommendation));
  };

  const handleTaskClose = () => {
    if (!activeTask) {
      setActiveTask(null);
      setTaskStep(0);
      return;
    }

    const nextContext = recordTaskClose(journeyContext);
    const resumeComponent = buildResumeTaskComponent(nextContext);

    setJourneyContext(nextContext);
    setActiveTask(null);
    setTaskStep(0);

    if (resumeComponent) {
      setMessages((prev: Message[]) => [...prev, {
        role: 'model',
        text: `您已中断当前任务，可随时继续${activeTask.title}。`,
        component: resumeComponent,
      }]);
    }
  };

  const handleTaskStepChange = (value: number | ((prev: number) => number)) => {
    setTaskStep((prev: number) => {
      const next = typeof value === 'function' ? value(prev) : value;
      setJourneyContext((current: JourneyContext) => recordTaskStepChange(current, next));
      return next;
    });
  };

  const handleTaskSelection = (selection: Record<string, unknown>) => {
    setJourneyContext((prev: JourneyContext) => recordTaskSelection(prev, selection));
  };

  const handleBasicInfoChange = (field: keyof UserProfile['basicInfo'], value: string) => {
    setUserProfile((prev: UserProfile) => ({
      ...prev,
      basicInfo: {
        ...prev.basicInfo,
        [field]: field === 'age' ? Number(value) || 0 : value,
      },
    }));
  };

  const handleHealthProfileChange = (field: keyof UserProfile['healthProfile'], value: string) => {
    setUserProfile((prev: UserProfile) => ({
      ...prev,
      healthProfile: {
        ...prev.healthProfile,
        [field]: value,
      },
    }));
  };

  const handleVisitRecordChange = (id: string, field: keyof VisitRecord, value: string) => {
    setUserProfile((prev: UserProfile) => ({
      ...prev,
      visitRecords: prev.visitRecords.map((record: VisitRecord) => (
        record.id === id ? { ...record, [field]: value } : record
      )),
    }));
  };

  const handleAddVisitRecord = () => {
    setUserProfile((prev: UserProfile) => ({
      ...prev,
      visitRecords: [
        ...prev.visitRecords,
        {
          id: `visit-${Date.now()}`,
          date: '2026-03-29',
          department: '',
          complaint: '',
          diagnosis: '',
          treatment: '',
        },
      ],
    }));
  };

  const handleGoHome = () => {
    setActiveView('business');
    setCurrentId(1);
    setHasIdentity(false);
    setActiveTask(null);
    setTaskStep(0);
    setTaskCompletionSummary(null);
    setPendingCompletionRecommendation(null);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    await sendMessage(inputValue.trim());
    setInputValue("");
  };

  const sendMessage = async (text: string, options?: { appendUserMessage?: boolean; autoOpenTask?: boolean; contextOverride?: JourneyContext }) => {
    if (isLoading) return;

    const appendUserMessage = options?.appendUserMessage ?? true;
    const autoOpenTask = options?.autoOpenTask ?? appendUserMessage;
    const contextForPrompt = options?.contextOverride ?? journeyContext;
    if (appendUserMessage) {
      setMessages((prev: Message[]) => [...prev, { role: 'user', text }]);
    }
    setIsLoading(true);

    try {
      const systemPrompt = `你是一个专业的医院问诊台咨询员。你的目标是识别用户当前最需要完成的一个任务，并提供该任务对应的组件或下一步推荐。

          任务原则：
          1. 一次只处理一个任务，不要在一次回复里串联多个任务。
          2. 只有“当前任务”可以通过 component 返回。
          3. 如果存在后续任务，只能通过 recommendation 返回，不能自动展开。
          4. recommendation 只是建议，由用户手动点击后才开始。

          常见任务：
          1. 预约挂号 (appointment)
          2. 签到候诊 (checkin)
          3. 诊后缴费 (payment)
          4. 完成检查 (examination)
          5. 查看报告 (report)
          6. 支付取药 (meds)
          7. 流程问询 (process)
          8. 位置导航 (location)
          9. 症状分诊/解释提示 (medical / tip)

          输出格式必须为 JSON：
          {
            "text": "给用户的文字回复",
            "category": "operation | process | information | emergency | task_recommendation",
            "component": {
              "type": "medical | appointment | checkin | payment | examination | report | meds | process | location | tip",
              "data": { ... }
            },
            "recommendation": {
              "type": "checkin | payment | examination | report | meds",
              "title": "推荐任务标题",
              "target": "推荐目标"
            }
          }

          组件数据结构：
          - medical: { "symptoms": ["症状1"], "recommendation": "科室名", "confidence": 0.9 }
          - appointment: { "department": "科室名", "doctors": [{"name": "医生名", "time": "时间", "fee": "金额"}] }
          - checkin: { "callingNumber": "A042", "aheadCount": 5, "waitMinutes": 15, "department": "呼吸内科门诊" }（均为可选，缺省用占位）
          - payment: { "lineItems": [{"name": "项目名称", "price": 45.0}], "total": 197.5, "statusLabel": "待支付" }（lineItems/total/statusLabel 可选）
          - examination: { "departmentLabel": "检验科（2楼）", "items": [{"name": "血常规(五分类)", "status": "completed"}, {"name": "项目2", "status": "pending", "location": "可选地点"}] }
          - meds: { "total": 45, "pickupWindow": "3号 门诊药房", "pickupCode": "28", "medicineItems": [{"name": "药品规格全名", "price": 32.5}] }（medicineItems 每项含 name+price；total 可选，默认同 medicineItems 合计）
          - recommendation: { "type": "checkin", "title": "前往签到", "target": "呼吸内科" }

          规则示例：
          - 用户问“肚子疼挂什么科” -> 返回 medical，不要同时返回 appointment。
          - 用户明确要挂号 -> 返回 appointment。
          - 用户完成挂号 -> 文本说明已完成，并在 recommendation 中推荐签到。
          - 用户完成检查 -> 文本说明已完成，并在 recommendation 中推荐查报告。
          - 不要把“签到 + 缴费 + 检查”在一次回复里一起安排。`;

      const profilePrompt = `当前用户档案(JSON)：\n${buildUserProfileSummary(userProfile, history, contextForPrompt)}`;
      const contextPrompt = `当前就诊上下文(JSON)：\n${buildAiContextSummary(contextForPrompt)}`;

      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "system", content: profilePrompt },
        { role: "system", content: contextPrompt },
        ...messages.map(m => ({
          role: (m.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.text
        })),
        { role: "user", content: text }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: chatMessages,
        response_format: { type: "json_object" },
      });

      const resultText = completion.choices[0]?.message?.content || "{}";
      let responseData;
      try {
        responseData = JSON.parse(resultText);
      } catch (e) {
        responseData = { text: resultText, component: null };
      }
      
      const newMessage: Message = {
        role: 'model',
        text: responseData.text || "",
        component: responseData.component,
        recommendation: responseData.recommendation
      };

      setMessages(prev => [...prev, newMessage]);
      if (taskCompletionSummary) {
        setPendingCompletionRecommendation(responseData.recommendation ?? null);
      }
      setJourneyContext((prev: JourneyContext) => recordRecommendation(prev, responseData.recommendation));

      if (responseData.component && autoOpenTask) {
        const task = {
          type: responseData.component.type,
          data: responseData.component.data,
          title: responseData.component.type === 'medical'
            ? '智能分诊'
            : responseData.component.type === 'appointment'
              ? '预约挂号'
              : responseData.component.type === 'checkin'
                ? '签到候诊'
                : responseData.component.type === 'payment'
                  ? '费用结算'
                  : responseData.component.type === 'report'
                    ? '报告查询'
                    : responseData.component.type === 'meds'
                      ? '支付取药'
                      : responseData.component.type === 'examination'
                        ? '完成检查'
                        : responseData.component.type === 'process'
                          ? '流程指引'
                          : responseData.component.type === 'location'
                            ? '位置导航'
                            : '温馨提示'
        } as AITask;

        handleTaskOpen(task);
      }
    } catch (error) {
      console.error("AI Error:", error);
      const msg =
        error instanceof OpenAI.APIError && error.status === 401
          ? "模型网关返回 401（密钥无效）。请把 .env 里的 OPENAI_API_KEY 改成该服务要求的真实密钥，保存后重新执行 npm run dev。"
          : "抱歉，问诊台系统繁忙，请稍后再试。";
      setMessages(prev => [...prev, { role: "model", text: msg }]);
    } finally {
      scrollToBottom();
      setIsLoading(false);
    }
  };

  const completeTask = (type: string, title: string) => {
    const flow = activeTask ? getStandardTaskFlow(activeTask.type as 'appointment' | 'checkin' | 'examination' | 'report' | 'meds') : null;

    if (activeTask && flow && taskStep < flow.steps.length - 1) {
      handleTaskStepChange(taskStep + 1);
      return;
    }

    const completedTask = activeTask ?? { type, title, data: {} } as AITask;
    const completedTaskType = activeTask?.type ?? type;
    const completedTaskTitle = activeTask?.title ?? title;
    const newRecord: TaskRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type: completedTaskType,
      title: completedTaskTitle,
      status: 'completed',
      timestamp: Date.now()
    };
    const nextContext = recordTaskCompletion(journeyContext, completedTask);

    setHistory(prev => [newRecord, ...prev]);
    setJourneyContext(nextContext);
    setPendingCompletionRecommendation(null);
    setTaskCompletionSummary(buildTaskCompletionSummary(completedTask));
    setActiveTask(null);
    setTaskStep(0);

    setMessages((prev: Message[]) => [...prev, {
      role: 'model',
      text: `${completedTaskTitle}已完成。请查看下方推荐，并手动开启下一步任务。`
    }]);

    void sendMessage(`我已完成${completedTaskTitle}，请只推荐我当前最适合开始的下一个任务，不要自动开始任务。`, {
      appendUserMessage: false,
      contextOverride: nextContext,
      autoOpenTask: false,
    });
  };

  const currentRenderedTask = activeTask ? buildTaskStepTask(activeTask, taskStep) ?? activeTask : null;

  const renderContent = () => {
    switch (currentId) {
      case 1:
        return (
          <div className="flex h-full w-full flex-col gap-4 sm:gap-6">
            {!hasIdentity ? (
              <>
                <div className="shrink-0 text-center px-2">
                  <p className="text-sm text-gray-500 sm:text-base">AI 助手将根据您的描述为您精准分诊</p>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {activeTask ? (
                    <AITaskRenderer
                      activeTask={currentRenderedTask}
                      taskStep={taskStep}
                      setTaskStep={handleTaskStepChange}
                      setActiveTask={(task) => {
                        if (task) {
                          handleTaskOpen(task);
                        } else {
                          void handleTaskClose();
                        }
                      }}
                      setCurrentId={setCurrentId}
                      setMedicalRequirement={setMedicalRequirement}
                      completeTask={completeTask}
                      recordSelection={handleTaskSelection}
                    />
                  ) : taskCompletionSummary ? (
                    <AITaskCompletionCard
                      summary={{
                        ...taskCompletionSummary,
                        primaryActionLabel: pendingCompletionRecommendation ? '开启下一任务' : taskCompletionSummary.primaryActionLabel,
                      }}
                      onPrimaryAction={() => {
                        if (pendingCompletionRecommendation) {
                          handleTaskOpen({
                            type: pendingCompletionRecommendation.type,
                            title: pendingCompletionRecommendation.title,
                            data: pendingCompletionRecommendation,
                          } as AITask, true);
                          return;
                        }

                        setTaskCompletionSummary(null);
                        setPendingCompletionRecommendation(null);
                        setHasIdentity(false);
                        setCurrentId(1);
                      }}
                      onFollowUp={(targetId) => {
                        if (typeof targetId === 'number') {
                          setCurrentId(targetId as ScenarioId);
                        }
                      }}
                    />
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white card-shadow">
                      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-gray-50/50 p-4 sm:gap-4 sm:p-5">
                        {messages.length === 1 && (
                          <div className="flex flex-1 flex-col items-center justify-center px-2 py-6 text-center sm:p-8">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-hospital-blue text-white shadow-lg sm:mb-6 sm:h-20 sm:w-20">
                              <Bot size={32} />
                            </div>
                            <h2 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">您好，我是 AI 咨询员</h2>
                            <p className="mb-6 max-w-md text-sm text-gray-500 sm:mb-8 sm:text-base">我可以为您提供分诊建议、流程指引、位置导航等服务。请问有什么可以帮您？</p>

                            <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:gap-4">
                              {[
                                { icon: Stethoscope, label: '症状分诊', color: 'bg-blue-50 text-blue-600', text: '我肚子疼挂什么科？' },
                                { icon: ClipboardCheck, label: '取药流程', color: 'bg-orange-50 text-orange-600', text: '如何取药？' },
                                { icon: MapPin, label: '位置导航', color: 'bg-green-50 text-green-600', text: '抽血室在哪里？' },
                                { icon: AlertCircle, label: '紧急求助', color: 'bg-red-50 text-red-600', text: '感觉头晕不舒服' }
                              ].map((action, i) => (
                                <button
                                  key={i}
                                  onClick={() => sendMessage(action.text)}
                                  className="group flex min-h-28 flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-hospital-blue hover:shadow-md sm:gap-3 sm:p-5"
                                >
                                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${action.color} transition-transform group-hover:scale-110 sm:h-12 sm:w-12`}>
                                    <action.icon size={22} />
                                  </div>
                                  <span className="text-sm font-bold text-gray-700 sm:text-base">{action.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {messages.length > 1 && messages.map((msg, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-start gap-2.5 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                          >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${
                              msg.role === 'user' ? 'bg-hospital-blue text-white' : 'bg-white text-hospital-blue shadow-sm'
                            }`}>
                              {msg.role === 'user' ? <UserIcon size={18} /> : <Bot size={18} />}
                            </div>
                            <div className={`max-w-[88%] rounded-2xl p-4 text-sm shadow-sm sm:max-w-[85%] sm:p-5 sm:text-base ${
                              msg.role === 'user'
                                ? 'rounded-tr-none bg-hospital-blue text-white'
                                : 'rounded-tl-none border border-gray-100 bg-white text-gray-800'
                            }`}>
                              <div className="whitespace-pre-wrap">{msg.text}</div>
                              {msg.role === 'model' && (
                                <AIMessageRenderer
                                  component={msg.component ?? null}
                                  onOpenTask={(task) => handleTaskOpen(task, msg.component?.type === 'recommendation')}
                                />
                              )}
                              {msg.role === 'model' && msg.recommendation && (
                                <AIMessageRenderer
                                  component={{ type: 'recommendation', data: msg.recommendation }}
                                  onOpenTask={(task) => handleTaskOpen(task, true)}
                                />
                              )}
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <div className="flex items-start gap-2.5 sm:gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-hospital-blue shadow-sm sm:h-10 sm:w-10">
                              <Bot size={18} />
                            </div>
                            <div className="rounded-2xl rounded-tl-none border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
                              <Loader2 size={22} className="animate-spin text-hospital-blue" />
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <div className="flex items-center gap-3 border-t bg-white p-3 sm:gap-4 sm:p-4">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="请描述您的问题，例如：如何取药？或者：肚子疼挂什么科？"
                          className="flex-1 rounded-2xl border border-transparent bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-hospital-blue sm:px-5 sm:py-4 sm:text-base"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={isLoading || !inputValue.trim()}
                          className="rounded-2xl bg-hospital-blue p-3 text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 sm:p-4"
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-hospital-blue text-lg font-bold text-white sm:h-16 sm:w-16 sm:text-2xl">张</div>
                    <div>
                      <div className="text-lg font-bold sm:text-2xl">张三，你好</div>
                      <div className="text-sm text-gray-500 sm:text-base">
                        {history.length > 0 ? `您已完成 ${history.length} 项任务` : '今日已为您识别到 6 项待办事项'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setHasIdentity(false)} className="self-start text-sm font-bold text-hospital-blue sm:self-auto sm:text-base">更换就诊人</button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                  {[
                    { title: '预约挂号', desc: '呼吸内科 / 专家门诊', icon: Calendar, target: 3 },
                    { title: '签到候诊', desc: '呼吸内科门诊 (10:30)', icon: ClipboardCheck, target: 2 },
                    { title: '诊后缴费', desc: '待缴费 1 笔 (¥152.00)', icon: CreditCard, target: 4 },
                    { title: '完成检查', desc: '血常规 / 胸部 X 光', icon: Search, target: 5 },
                    { title: '取报告', desc: '血常规报告已出', icon: FileText, target: 6 },
                    { title: '支付取药', desc: '待支付 1 笔 (¥45.00)', icon: ClipboardCheck, target: 1, taskType: 'meds' as const }
                  ].map((task, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (task.taskType) {
                          handleTaskOpen({
                            type: task.taskType,
                            data: {},
                            title: task.title
                          });
                        } else {
                          setCurrentId(task.target as ScenarioId);
                        }
                      }}
                      className="task-card group flex flex-row items-center justify-between gap-3 p-4 sm:p-5"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-hospital-blue sm:h-14 sm:w-14">
                          <task.icon size={24} />
                        </div>
                        <div className="text-left">
                          <div className="text-base font-bold sm:text-lg">{task.title}</div>
                          <div className="text-xs text-gray-500 sm:text-sm">{task.desc}</div>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-hospital-blue" />
                    </button>
                  ))}

                  {history.length > 0 && (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="px-2 text-sm font-bold text-gray-500 sm:text-base">最近完成</div>
                      {history.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 opacity-70 sm:p-5"
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 sm:h-12 sm:w-12">
                              <CheckCircle2 size={20} />
                            </div>
                            <div>
                              <div className="text-base font-bold text-gray-800 sm:text-lg">{record.title}</div>
                              <div className="text-xs text-gray-400 sm:text-sm">{new Date(record.timestamp).toLocaleTimeString()} 已完成</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setHasIdentity(false)}
                  className="mt-2 flex items-center justify-center gap-2 rounded-2xl border-2 border-hospital-blue bg-white py-3 text-sm font-bold text-hospital-blue transition-all hover:bg-blue-50 sm:mt-4 sm:py-4 sm:text-base"
                >
                  <MessageSquare size={18} /> 我有新的就诊需求 (AI问诊)
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="flex w-full flex-col gap-6 text-center sm:gap-8">
            <div>
              <h1 className="mb-3 text-3xl font-bold sm:text-4xl">你现在先签到</h1>
              <p className="text-base text-gray-500 sm:text-lg">你今天有一条待签到门诊</p>
            </div>

            <div className="rounded-3xl border-t-8 border-hospital-blue bg-white p-5 card-shadow sm:p-8">
              <div className="flex flex-col gap-5 sm:gap-6">
                {[
                  { label: '科室', value: '呼吸内科门诊' },
                  { label: '就诊地点', value: '门诊楼 3 层 A 区' }
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1 border-b pb-4 text-left last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-gray-500 sm:text-base">{item.label}</span>
                    <span className="text-xl font-bold sm:text-2xl">{item.value}</span>
                  </div>
                ))}
                <div className="flex flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-500 sm:text-base">就诊时间</span>
                  <div className="sm:text-right">
                    <span className="text-xl font-bold text-hospital-blue sm:text-2xl">10:30 - 11:00</span>
                    <div className="mt-1 text-sm font-bold text-red-500">请在 10:45 前完成签到</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-col gap-3 sm:gap-4">
              <button onClick={() => setCurrentId(7)} className="btn-primary">立即签到</button>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <button onClick={() => setCurrentId(7)} className="btn-secondary">查看地点</button>
                <button onClick={() => setHasIdentity(false)} className="btn-secondary">更换就诊人</button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex w-full flex-col gap-6 sm:gap-8">
            {medicalRequirement ? (
              <div className="flex flex-col gap-6 sm:gap-8">
                <div className="text-center">
                  <h1 className="mb-3 text-3xl font-bold sm:text-4xl">为您推荐的挂号科室</h1>
                  <p className="text-base text-gray-500 sm:text-lg">根据您的需求：<span className="font-bold text-hospital-blue">“{medicalRequirement}”</span></p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:gap-5">
                  {[
                    { dept: '呼吸内科', doctor: '王主任', time: '今日下午 14:00', fee: '¥50', tags: ['专家号', '推荐'] },
                    { dept: '全科门诊', doctor: '普通号', time: '今日下午 13:30', fee: '¥20', tags: ['普通号'] },
                    { dept: '急诊内科', doctor: '值班医生', time: '即刻就诊', fee: '¥30', tags: ['急诊'] }
                  ].map((item, i) => (
                    <div key={i} className="task-card group flex flex-col gap-4 border-l-4 border-l-hospital-blue p-5 text-left sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4 sm:gap-5">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-hospital-blue sm:h-16 sm:w-16">
                          <Stethoscope size={28} />
                        </div>
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-xl font-bold sm:text-2xl">{item.dept}</span>
                            {item.tags.map((tag) => (
                              <span key={tag} className={`rounded px-2 py-1 text-xs sm:text-sm ${tag === '推荐' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{tag}</span>
                            ))}
                          </div>
                          <div className="text-sm text-gray-500 sm:text-base">{item.doctor} · {item.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:gap-4 lg:min-w-[220px] lg:justify-end">
                        <div className="text-2xl font-bold text-orange-500 sm:text-3xl">{item.fee}</div>
                        <button onClick={() => setCurrentId(4)} className="rounded-xl bg-hospital-blue px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform group-hover:scale-105 sm:px-6 sm:text-base">
                          立即挂号
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setMedicalRequirement('');
                    setIsFirstTime(false);
                  }}
                  className="mt-2 text-sm font-bold text-gray-400 sm:text-base"
                >
                  重新输入需求
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-center text-3xl font-bold sm:text-4xl">这次想怎么预约？</h1>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { title: '我知道挂哪个科', desc: '直接选择科室/医生', icon: UserPlus },
                    { title: '我不确定挂哪个科', desc: '按症状智能导诊', icon: HelpCircle },
                    { title: '复诊找医生', desc: '找上次看过的医生', icon: History }
                  ].map((item, i) => (
                    <button key={i} className="task-card flex min-h-52 items-center justify-center p-6 text-center sm:min-h-60 sm:p-8">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-hospital-blue sm:h-20 sm:w-20">
                        <item.icon size={32} />
                      </div>
                      <div className="mb-2 text-lg font-bold sm:text-xl">{item.title}</div>
                      <div className="text-sm text-gray-400 sm:text-base">{item.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-1 flex flex-col items-center justify-center gap-3 text-sm font-bold text-gray-400 sm:flex-row sm:gap-6 sm:text-base">
                  <button className="flex items-center gap-2">
                    查看全部科室 <ChevronRight size={18} />
                  </button>
                  <div className="hidden h-6 w-px bg-gray-200 sm:block"></div>
                  <button className="flex items-center gap-2">
                    帮家人预约 <User size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="flex w-full flex-col gap-6 text-center sm:gap-8">
            <div>
              <h1 className="mb-3 text-3xl font-bold sm:text-4xl">你现在需要先缴费</h1>
              <p className="text-base text-gray-500 sm:text-lg">缴费后可继续后续就诊/检查</p>
            </div>

            <div className="rounded-3xl border-t-8 border-orange-400 bg-white p-5 card-shadow sm:p-8">
              <div className="flex flex-col gap-5 sm:gap-6">
                <div className="flex flex-col gap-1 border-b pb-4 text-left sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-500 sm:text-base">待缴笔数</span>
                  <span className="text-xl font-bold sm:text-2xl">1 笔</span>
                </div>
                <div className="flex flex-col gap-1 border-b pb-4 text-left sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-500 sm:text-base">总金额</span>
                  <span className="text-3xl font-bold text-orange-500 sm:text-4xl">¥ 152.00</span>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-orange-50 p-4 text-left">
                  <Info className="mt-0.5 shrink-0 text-orange-400" size={20} />
                  <div>
                    <div className="text-base font-bold text-orange-800 sm:text-lg">后续事项：血常规检查</div>
                    <div className="text-sm text-orange-600">缴费成功后请前往门诊楼 2 层检验科</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-col gap-3 sm:gap-4">
              <button onClick={() => setCurrentId(5)} className="btn-primary border-none bg-orange-500">立即缴费</button>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <button className="btn-secondary border-orange-500 text-orange-500">查看费用明细</button>
                <button className="btn-secondary border-orange-500 text-orange-500">只处理最急的一项</button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="flex w-full flex-col gap-6 text-center sm:gap-8">
            <div>
              <h1 className="mb-3 text-3xl font-bold sm:text-4xl">你接下来要去做检查</h1>
              <p className="text-base text-gray-500 sm:text-lg">先确认准备要求和地点</p>
            </div>

            <div className="rounded-3xl border-t-8 border-hospital-blue bg-white p-5 card-shadow sm:p-8">
              <div className="flex flex-col gap-5 sm:gap-6">
                <div className="flex flex-col gap-1 border-b pb-4 text-left sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-500 sm:text-base">检查名称</span>
                  <span className="text-xl font-bold sm:text-2xl">腹部超声检查</span>
                </div>
                <div className="flex flex-col gap-1 border-b pb-4 text-left sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-500 sm:text-base">检查地点</span>
                  <span className="text-xl font-bold sm:text-2xl">医技楼 2 层 超声科</span>
                </div>
                <div className="flex flex-col gap-3 rounded-2xl bg-blue-50 p-4 text-left sm:p-5">
                  <div className="flex items-center gap-2 text-base font-bold text-hospital-blue sm:text-lg">
                    <AlertCircle size={20} /> 准备要求
                  </div>
                  <ul className="list-inside list-disc space-y-2 text-sm text-gray-700 sm:text-base">
                    <li>需空腹（禁食 8 小时以上）</li>
                    <li>检查前请勿大量饮水</li>
                    <li>请携带有效身份证件</li>
                  </ul>
                  <div className="mt-1 flex items-center gap-2 text-sm font-bold text-red-500 sm:text-base">
                    <Clock size={18} /> 当前状态：未满足空腹要求？
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-col gap-3 sm:gap-4">
              <button onClick={() => setCurrentId(7)} className="btn-primary">查看准备要求</button>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <button onClick={() => setCurrentId(7)} className="btn-secondary">查看地点</button>
                <button className="btn-secondary">打印单据</button>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="flex w-full flex-col gap-6 text-center sm:gap-8">
            <div>
              <h1 className="mb-3 text-3xl font-bold sm:text-4xl">你的报告已可以领取</h1>
              <p className="text-base text-gray-500 sm:text-lg">共 2 份报告可打印</p>
            </div>

            <div className="rounded-3xl border-t-8 border-green-500 bg-white p-5 card-shadow sm:p-8">
              <div className="flex flex-col gap-4 sm:gap-5">
                {[
                  { name: '血常规检验报告', time: '2024-03-25 09:30', status: '可打印' },
                  { name: '胸部 X 线检查报告', time: '2024-03-25 10:15', status: '窗口领取' }
                ].map((report, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div>
                      <div className="text-lg font-bold sm:text-xl">{report.name}</div>
                      <div className="text-sm text-gray-500 sm:text-base">{report.time}</div>
                    </div>
                    <span className={`self-start rounded-lg px-3 py-1.5 text-sm font-bold sm:self-auto ${report.status === '可打印' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {report.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-1 flex flex-col gap-3 sm:gap-4">
              <button onClick={() => setCurrentId(9)} className="btn-primary border-none bg-green-600">
                <Printer size={22} /> 打印全部可打印报告
              </button>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <button className="btn-secondary border-green-600 text-green-600">只打印最新一份</button>
                <button onClick={() => setCurrentId(7)} className="btn-secondary border-green-600 text-green-600">查看领取地点</button>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="flex w-full flex-col gap-6 text-center sm:gap-8">
            <div>
              <h1 className="mb-3 text-3xl font-bold sm:text-4xl">接下来请前往这里</h1>
              <p className="text-base text-gray-500 sm:text-lg">目的地：门诊楼 3 层 A 区</p>
            </div>

            <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-3xl border-2 border-gray-100 bg-white p-4 card-shadow sm:aspect-video sm:min-h-0 sm:p-6">
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-400">
                  <Navigation size={72} className="mx-auto mb-3 opacity-20 sm:mb-4 sm:size-auto" />
                  <p className="text-base sm:text-lg">路线图加载中...</p>
                </div>
              </div>
              <div className="relative z-10 max-w-xs rounded-2xl border border-white bg-white/90 p-4 shadow-lg backdrop-blur sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-hospital-blue text-white">
                    <MapPin size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">当前位置</div>
                    <div className="text-sm text-gray-500">1层 大厅自助机</div>
                  </div>
                </div>
                <div className="my-2 ml-5 h-10 w-px bg-gray-200"></div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">目的地</div>
                    <div className="text-sm text-gray-500">3层 A区 呼吸内科</div>
                  </div>
                </div>
                <div className="mt-5 flex justify-between border-t pt-4 text-sm font-bold">
                  <span>预计步行</span>
                  <span className="text-hospital-blue">3 分钟</span>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-col gap-3 sm:gap-4">
              <button onClick={() => setCurrentId(9)} className="btn-primary">开始查看路线</button>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <button className="btn-secondary">打印路线</button>
                <button onClick={handleGoHome} className="btn-secondary">返回当前任务</button>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="flex w-full flex-col gap-6 text-center sm:gap-8">
            <div className="flex flex-col items-center gap-4 sm:gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500 sm:h-24 sm:w-24">
                <AlertCircle size={48} />
              </div>
              <div>
                <h1 className="mb-3 text-3xl font-bold sm:text-4xl">这一步我没能直接帮你完成</h1>
                <p className="text-base text-gray-500 sm:text-lg">未查询到你今日的预约记录</p>
              </div>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-3 sm:gap-4">
              <button onClick={() => setCurrentId(3)} className="task-card flex flex-row items-center gap-3 border-2 border-hospital-blue bg-white p-4 sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-hospital-blue sm:h-14 sm:w-14">
                  <Calendar size={24} />
                </div>
                <div className="ml-1 flex-1 text-left sm:ml-3">
                  <div className="text-lg font-bold sm:text-xl">重新预约</div>
                  <div className="text-sm text-gray-500 sm:text-base">如果你还没挂号，请点这里</div>
                </div>
                <ChevronRight className="text-hospital-blue" />
              </button>

              <button className="task-card flex flex-row items-center gap-3 bg-white p-4 sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 sm:h-14 sm:w-14">
                  <PhoneCall size={24} />
                </div>
                <div className="ml-1 flex-1 text-left sm:ml-3">
                  <div className="text-lg font-bold sm:text-xl">转人工窗口</div>
                  <div className="text-sm text-gray-500 sm:text-base">前往 1 层 1-5 号人工服务窗口</div>
                </div>
                <ChevronRight className="text-gray-300" />
              </button>
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:mt-4 sm:gap-4">
              <button onClick={handleGoHome} className="btn-secondary">
                <RotateCcw size={20} /> 重新识别今日事项
              </button>
              <button className="text-sm font-bold text-gray-400 sm:text-base">呼叫帮助</button>
            </div>
          </div>
        );

      case 9:
        return (
          <AITaskCompletionCard
            summary={buildTaskCompletionSummary({ type: 'tip', title: '完成离场', data: {} })}
            onPrimaryAction={() => {
              setHasIdentity(false);
              setCurrentId(1);
            }}
            onFollowUp={(targetId) => {
              if (typeof targetId === 'number') {
                setCurrentId(targetId as ScenarioId);
              }
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-hospital-bg">
      <TopTabs activeView={activeView} onChange={setActiveView} />

      <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
        {activeView === 'library' ? (
          <div className="flex w-full justify-center">
            <AIComponentLibraryPage />
          </div>
        ) : activeView === 'profile' ? (
          <div className="flex w-full justify-center">
            <UserProfilePage
              profile={userProfile}
              onBasicInfoChange={handleBasicInfoChange}
              onHealthProfileChange={handleHealthProfileChange}
              onVisitRecordChange={handleVisitRecordChange}
              onAddVisitRecord={handleAddVisitRecord}
            />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex min-h-full w-full justify-center"
            >
              <div className="w-full max-w-5xl">{renderContent()}</div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <footer className="shrink-0 border-t bg-white px-3 py-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:text-base">
          <div className="flex items-center justify-between gap-3 text-gray-500 sm:justify-start sm:gap-5">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span className="font-mono text-sm sm:text-base">10:15:30</span>
            </div>
            <div className="h-4 w-px bg-gray-200 sm:h-5"></div>
            <div className="text-xs sm:text-sm">终端编号: ZD-0822</div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-5">
            <button className="flex items-center gap-1.5 text-sm font-bold text-hospital-blue sm:gap-2 sm:text-base">
              <PhoneCall size={18} /> 呼叫人工
            </button>
            <div className="h-4 w-px bg-gray-200 sm:h-5"></div>
            <button
              onClick={handleGoHome}
              className="flex items-center gap-1.5 text-sm font-bold text-gray-500 sm:gap-2 sm:text-base"
            >
              <RotateCcw size={18} /> 返回首页
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
