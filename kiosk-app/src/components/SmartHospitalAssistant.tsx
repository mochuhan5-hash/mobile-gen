/* eslint-disable react/no-array-index-key */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Volume2, Sparkles } from "lucide-react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

type SuggestionCategory =
  | "灵魂三问"
  | "操作类"
  | "流程类"
  | "信息类"
  | "分诊类"
  | "应急类";

type KnowledgeEntry = {
  category: SuggestionCategory;
  prompt: string;
  answer: string;
};

type KioskZone = "门诊大厅" | "收费区" | "检验区" | "住院区";

type DeterministicEvidence = {
  hasAppointmentToday: boolean;
  nearestAppointmentTime?: string;
  nearestAppointmentDept?: string;
  hasPendingCheckIn: boolean;
  unpaidOrderCount: number;
  reportReadyCount: number;
  queueStatus?: "未排队" | "排队中" | "已过号";
  minutesToNearestVisit?: number;
  hasInterruptedTask: boolean;
};

type ScenarioEvidence = {
  kioskZone: KioskZone;
  justFinishedRegistration: boolean;
};

type BehaviorEvidence = {
  idleSeconds: number;
  repeatedSameClickCount: number;
  cancelCount: number;
  crossMenuJumpCount: number;
};

type UserStateEvidence = {
  deterministic: DeterministicEvidence;
  scenario: ScenarioEvidence;
  behavior: BehaviorEvidence;
};

type TaskType =
  | "签到"
  | "缴费"
  | "打印报告"
  | "找科室"
  | "进入候诊"
  | "异常处理"
  | "人工协助";

type TaskCandidate = {
  task: TaskType;
  score: number;
  reasons: string[];
};

export type SmartHospitalAssistantProps = {
  /**
   * 可选：替换/扩展内置知识库（用于后续接真实 AI 或更新医院话术）。
   */
  knowledgeBase?: KnowledgeEntry[];
  /**
   * 可选：接入真实语音识别 SDK 的回调。
   * 返回识别到的文本后，本组件会按知识库规则生成回复（或调用 `onGenerateReply`）。
   */
  onTranscribe?: () => Promise<string>;
  /**
   * 可选：当知识库没有匹配到时，可调用真实 AI 生成回复。
   */
  onGenerateReply?: (question: string) => Promise<string>;
  /**
   * 可选：外部实时注入用户状态证据（HIS/排队系统/订单系统）。
   * 若不传，组件会使用内置 mock 数据演示智能识别。
   */
  userStateEvidence?: UserStateEvidence;
};

const DEFAULT_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    category: "灵魂三问",
    prompt: "挂什么科？",
    answer:
      "请先说清您的主要症状（例如：头疼/肚子疼/发热）和大概持续时间。\n" +
      "如果您不确定挂哪科：优先选择“急诊/人工协助”入口，系统会给出具体办理位置。\n" +
      "若出现严重不适（突然剧痛、意识异常、呼吸困难等），请直接联系急诊。",
  },
  {
    category: "灵魂三问",
    prompt: "机器怎么用？",
    answer:
      "1. 点击“点击说话”说出你的问题，或直接点“猜你想问”。\n" +
      "2. 等待屏幕显示答案。\n" +
      "3. 需要办理业务时，请按提示选择下一步。\n" +
      "4. 如遇到无法完成的情况，请联系人工服务窗口。",
  },
  {
    category: "灵魂三问",
    prompt: "XX室在哪？",
    answer:
      "请告诉我完整信息：`楼层 + 科室/诊室号`（例如：3楼内科诊室12）。\n" +
      "如果您只有“XX室”编号，也可以先查看“科室楼层怎么找”，再按楼层寻找具体位置。\n" +
      "找不到时，系统会直接显示人工服务窗口位置与路线。",
  },

  {
    category: "操作类",
    prompt: "插卡/扫码怎么做？",
    answer:
      "1. 将卡片插入/将二维码对准扫码区域。\n" +
      "2. 等待系统识别完成。\n" +
      "3. 进入后按屏幕提示选择业务（挂号/缴费等）。",
  },
  {
    category: "操作类",
    prompt: "医保出示怎么操作？",
    answer:
      "1. 点击“医保出示”。\n" +
      "2. 按屏幕提示展示医保信息（卡片或扫码）。\n" +
      "3. 等待核验通过后继续办理。",
  },
  {
    category: "操作类",
    prompt: "报告打印怎么取？",
    answer:
      "1. 选择“报告打印”。\n" +
      "2. 完成身份核验（插卡/扫码按提示）。\n" +
      "3. 等待打印完成后，从打印口取走纸质报告。",
  },

  {
    category: "流程类",
    prompt: "就医先后顺序？",
    answer:
      "常见顺序是：挂号 -> 缴费 -> 检查/取报告 -> 复诊或取药。\n" +
      "如果您不确定：先从“挂什么科？”开始，根据提示完成后续步骤。",
  },
  {
    category: "流程类",
    prompt: "取药地点在哪？",
    answer:
      "取药通常在医院的药房/窗口区域。\n" +
      "建议您在屏幕选择“取药地点”，系统会给出对应位置与办理指引。",
  },
  {
    category: "流程类",
    prompt: "住院办理怎么做？",
    answer:
      "1. 在终端选择“住院办理”。\n" +
      "2. 按提示完成身份核验。\n" +
      "3. 确认住院相关信息并提交。\n" +
      "4. 如需要人工协助，请前往指定窗口办理。",
  },

  {
    category: "信息类",
    prompt: "科室楼层怎么找？",
    answer:
      "1. 选择“科室楼层/科室信息”。\n" +
      "2. 输入或选择科室名称。\n" +
      "3. 系统将显示所在楼层与指引路线。",
  },
  {
    category: "信息类",
    prompt: "医生排班怎么看？",
    answer:
      "1. 选择“医生排班”。\n" +
      "2. 选择科室与日期（如有筛选项）。\n" +
      "3. 查看医生姓名、出诊时间后再进行挂号。",
  },
  {
    category: "信息类",
    prompt: "厕所/电梯/充电宝在哪？",
    answer:
      "选择“生活服务信息”，系统会提供对应位置。\n" +
      "若您不清楚具体方向：系统会直接显示最近电梯/卫生间/充电点位置信息。",
  },

  {
    category: "分诊类",
    prompt: "头疼挂什么科？",
    answer:
      "优先建议：神经内科/急诊。\n" +
      "如果是突然剧烈头痛、伴意识异常/抽搐/偏瘫等，请直接去急诊。",
  },
  {
    category: "分诊类",
    prompt: "肚子疼挂什么科？",
    answer:
      "常见建议：消化内科/普外科/急诊。\n" +
      "若腹痛非常剧烈、持续加重或伴发热/呕吐/便血，请优先去急诊。",
  },
  {
    category: "分诊类",
    prompt: "发热去哪科？",
    answer:
      "建议：发热门诊/呼吸内科/感染科。\n" +
      "若高热不退、呼吸困难或明显加重，请立即联系急诊。",
  },

  {
    category: "应急类",
    prompt: "退费怎么处理？",
    answer:
      "1. 选择“退费”。\n" +
      "2. 按提示核验信息与原因。\n" +
      "3. 如终端无法完成或提示失败，请前往人工服务窗口协助处理。",
  },
  {
    category: "应急类",
    prompt: "加号怎么申请？",
    answer:
      "1. 选择“加号”。\n" +
      "2. 填写/确认就诊信息。\n" +
      "3. 等待系统结果或按提示前往人工窗口确认。",
  },
  {
    category: "应急类",
    prompt: "结果出炉时间？",
    answer:
      "请说出检查/检验项目名称（例如：血常规、CT 等）以及就诊时间。\n" +
      "系统会按项目类型给出预计出炉时间；如超时会直接给出对应处理入口。",
  },
];

const DEFAULT_EVIDENCE: UserStateEvidence = {
  deterministic: {
    hasAppointmentToday: true,
    nearestAppointmentTime: "10:20",
    nearestAppointmentDept: "消化内科",
    hasPendingCheckIn: true,
    unpaidOrderCount: 2,
    reportReadyCount: 1,
    queueStatus: "未排队",
    minutesToNearestVisit: 18,
    hasInterruptedTask: false,
  },
  scenario: {
    kioskZone: "门诊大厅",
    justFinishedRegistration: true,
  },
  behavior: {
    idleSeconds: 0,
    repeatedSameClickCount: 0,
    cancelCount: 0,
    crossMenuJumpCount: 0,
  },
};

/**
 * 将“确定性证据 + 场景证据 + 行为证据”映射成可执行任务候选。
 */
function inferTaskCandidates(evidence: UserStateEvidence): {
  candidates: TaskCandidate[];
  needSimpleMode: boolean;
  confusionLevel: "低" | "中" | "高";
} {
  const result: TaskCandidate[] = [];
  const { deterministic, scenario, behavior } = evidence;

  const pushTask = (task: TaskType, score: number, reason: string) => {
    const exist = result.find((x) => x.task === task);
    if (!exist) {
      result.push({ task, score, reasons: [reason] });
      return;
    }
    exist.score += score;
    exist.reasons.push(reason);
  };

  if (deterministic.hasPendingCheckIn) {
    pushTask("签到", 80, "存在待签到记录");
  }
  if (deterministic.hasAppointmentToday && deterministic.minutesToNearestVisit !== undefined) {
    if (deterministic.minutesToNearestVisit <= 30) {
      pushTask("签到", 30, "临近门诊时间");
    }
  }
  if (deterministic.unpaidOrderCount > 0) {
    pushTask("缴费", 75, `有 ${deterministic.unpaidOrderCount} 笔未缴费订单`);
  }
  if (deterministic.reportReadyCount > 0) {
    pushTask("打印报告", 70, `有 ${deterministic.reportReadyCount} 份报告已出`);
  }
  if (deterministic.queueStatus === "排队中") {
    pushTask("进入候诊", 65, "当前正在排队中");
  }
  if (deterministic.queueStatus === "已过号") {
    pushTask("异常处理", 90, "当前状态为已过号");
  }
  if (deterministic.hasInterruptedTask) {
    pushTask("异常处理", 50, "存在中断未完成任务");
  }

  if (scenario.kioskZone === "门诊大厅") {
    pushTask("找科室", 20, "当前位于门诊大厅");
  }
  if (scenario.kioskZone === "收费区") {
    pushTask("缴费", 25, "当前位于收费区");
  }
  if (scenario.kioskZone === "检验区") {
    pushTask("打印报告", 25, "当前位于检验区附近");
  }
  if (scenario.justFinishedRegistration) {
    pushTask("签到", 18, "刚完成挂号，下一步通常为签到/候诊");
  }

  let confusionScore = 0;
  if (behavior.idleSeconds >= 20) confusionScore += 20;
  if (behavior.repeatedSameClickCount >= 2) confusionScore += 25;
  if (behavior.cancelCount >= 2) confusionScore += 20;
  if (behavior.crossMenuJumpCount >= 3) confusionScore += 25;

  let confusionLevel: "低" | "中" | "高" = "低";
  if (confusionScore >= 45) confusionLevel = "高";
  else if (confusionScore >= 20) confusionLevel = "中";

  if (confusionLevel === "中") {
    pushTask("人工协助", 35, "检测到用户可能存在操作困惑");
  }
  if (confusionLevel === "高") {
    pushTask("人工协助", 70, "检测到高困惑状态，建议人工介入");
  }

  const sorted = result.sort((a, b) => b.score - a.score).slice(0, 3);
  return {
    candidates: sorted,
    needSimpleMode: confusionLevel !== "低",
    confusionLevel,
  };
}

/**
 * 将任务类型映射为可直接执行的快捷问答。
 */
function taskToKnowledgeEntry(task: TaskType): KnowledgeEntry {
  const fallback: KnowledgeEntry = {
    category: "流程类",
    prompt: "就医先后顺序？",
    answer: "常见顺序：挂号 -> 缴费 -> 检查/取报告 -> 复诊或取药。",
  };
  const table: Record<TaskType, KnowledgeEntry> = {
    签到: {
      category: "流程类",
      prompt: "签到怎么做？",
      answer: "1. 选择“签到”。\n2. 完成身份核验。\n3. 按提示进入候诊。",
    },
    缴费: {
      category: "操作类",
      prompt: "挂号/缴费怎么操作？",
      answer: "1. 选择“缴费”。\n2. 核对待缴清单。\n3. 完成支付并保留凭证。",
    },
    打印报告: {
      category: "操作类",
      prompt: "报告打印怎么取？",
      answer: "1. 选择“报告打印”。\n2. 完成身份核验。\n3. 从打印口取走报告。",
    },
    找科室: {
      category: "信息类",
      prompt: "科室楼层怎么找？",
      answer: "1. 选择“科室楼层/科室信息”。\n2. 输入科室名。\n3. 查看楼层与路线。",
    },
    进入候诊: {
      category: "流程类",
      prompt: "就医先后顺序？",
      answer: "您当前更建议先进入候诊。\n请留意叫号屏，按顺序就诊。",
    },
    异常处理: {
      category: "应急类",
      prompt: "过号/异常怎么办？",
      answer: "请先选择“异常处理”。\n若无法自助恢复，请前往人工窗口协助。",
    },
    人工协助: {
      category: "应急类",
      prompt: "我需要人工帮助",
      answer: "检测到您可能需要帮助。\n建议点击人工协助入口，系统将显示人工服务窗口位置。",
    },
  };
  return table[task] ?? fallback;
}

/**
 * 医院一体机智能助手（MVP）。
 *
 * 设计目标：极简、高对比、适配老年人/急诊场景；除语音输入外避免动效。
 */
export default function SmartHospitalAssistant(props: SmartHospitalAssistantProps) {
  const knowledgeBase = props.knowledgeBase ?? DEFAULT_KNOWLEDGE_BASE;
  const [behaviorEvidence, setBehaviorEvidence] = useState<BehaviorEvidence>(
    props.userStateEvidence?.behavior ?? DEFAULT_EVIDENCE.behavior
  );
  const lastActionTimeRef = useRef<number>(Date.now());
  const lastSuggestionRef = useRef<string>("");

  const byPrompt = useMemo(() => {
    const map = new Map<string, KnowledgeEntry>();
    for (const entry of knowledgeBase) map.set(entry.prompt, entry);
    return map;
  }, [knowledgeBase]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const hello: ChatMessage = {
      id: "init-assistant",
      role: "assistant",
      content:
        "欢迎使用医院智能助手。\n" +
        "你可以直接点击“猜你想问”，也可以按“点击说话”提问。",
      createdAt: Date.now(),
    };
    return [hello];
  });

  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0); // 0..1
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // 仅语音输入区域动效：录音时模拟音量变化。
  useEffect(() => {
    if (!isRecording) {
      setVolume(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const t = (Date.now() - startedAt) / 1000;
      // 使用“接近波形”的随机值，形成稳定但不突兀的音量条变化。
      const wave = 0.5 + 0.5 * Math.sin(t * 5.2);
      const jitter = Math.random() * 0.35;
      const next = Math.max(0, Math.min(1, wave * 0.65 + jitter));
      setVolume(next);
    }, 160);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    // 聊天区无需动效，但需要保持滚动在最新消息。
    chatEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const idle = Math.floor((Date.now() - lastActionTimeRef.current) / 1000);
      setBehaviorEvidence((prev) => ({ ...prev, idleSeconds: idle }));
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const effectiveEvidence = useMemo<UserStateEvidence>(() => {
    const base = props.userStateEvidence ?? DEFAULT_EVIDENCE;
    return {
      deterministic: base.deterministic,
      scenario: base.scenario,
      behavior: behaviorEvidence,
    };
  }, [props.userStateEvidence, behaviorEvidence]);

  const personalized = useMemo(() => inferTaskCandidates(effectiveEvidence), [effectiveEvidence]);

  /**
   * 将消息追加到聊天窗口。
   */
  const pushMessage = (role: ChatRole, content: string) => {
    const msg: ChatMessage = {
      id: `${role}-${Math.random().toString(16).slice(2)}-${Date.now()}`,
      role,
      content,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  /**
   * 从知识库中尝试找到问题的确定答案（MVP 优先级最高）。
   */
  const tryGetKnowledgeAnswer = (question: string) => {
    // MVP：优先匹配“完全等于”的知识库 prompt。
    const exact = byPrompt.get(question);
    if (exact) return exact.answer;

    // 兜底：轻量的关键词匹配（避免引入 AI，但仍能覆盖部分语音差异）。
    const q = question.trim();
    const hit =
      knowledgeBase.find((e) => {
        const p = e.prompt;
        return q.includes(p) || p.includes(q);
      }) ?? null;

    return hit?.answer ?? null;
  };

  /**
   * 处理用户提问：先尝试知识库匹配；若失败再调用真实 AI（可选）。
   */
  const handleQuestion = async (question: string) => {
    lastActionTimeRef.current = Date.now();
    setBehaviorEvidence((prev) => ({ ...prev, idleSeconds: 0 }));
    const normalized = question.trim();
    if (!normalized) return;

    pushMessage("user", normalized);

    // 先用知识库给出确定回复（MVP 优先级最高）。
    const kbAnswer = tryGetKnowledgeAnswer(normalized);
    if (kbAnswer) {
      window.setTimeout(() => pushMessage("assistant", kbAnswer), 240);
      return;
    }

    if (props.onGenerateReply) {
      try {
        const reply = await props.onGenerateReply(normalized);
        pushMessage("assistant", reply);
        return;
      } catch {
        // fall through to fallback below
      }
    }

    pushMessage(
      "assistant",
      "我暂时没有找到这个问题的标准答案。你可以改问“挂什么科/机器怎么用/科室楼层怎么找”等，或前往人工窗口咨询。"
    );
  };

  /**
   * 点击“猜你想问”词条时触发。
   */
  const handleSuggestionClick = async (entry: KnowledgeEntry) => {
    lastActionTimeRef.current = Date.now();
    setBehaviorEvidence((prev) => {
      const repeated = lastSuggestionRef.current === entry.prompt;
      return {
        ...prev,
        idleSeconds: 0,
        repeatedSameClickCount: repeated ? prev.repeatedSameClickCount + 1 : 0,
      };
    });
    lastSuggestionRef.current = entry.prompt;
    // 模拟“用户点击 -> 直接回复对应答案”
    await handleQuestion(entry.prompt);
  };

  /**
   * 点击语音按钮进行录音/停止录音，并在停止后执行转写与回复生成。
   */
  const handleSpeechToggle = async () => {
    lastActionTimeRef.current = Date.now();
    if (!isRecording) {
      setIsRecording(true);
      return;
    }

    setIsRecording(false);
    setBehaviorEvidence((prev) => ({ ...prev, cancelCount: prev.cancelCount + 1 }));

    // MVP：录音停止后，模拟转写结果（或使用 SDK 回调）。
    let transcript = "";
    try {
      transcript = (await props.onTranscribe?.()) ?? "";
    } catch {
      transcript = "";
    }

    if (!transcript) {
      const candidates = knowledgeBase.map((k) => k.prompt);
      transcript = candidates[Math.floor(Math.random() * candidates.length)] ?? "挂什么科？";
    }

    await handleQuestion(transcript);
  };

  const categoriesInOrder: SuggestionCategory[] = useMemo(
    () => ["灵魂三问", "操作类", "流程类", "信息类", "分诊类", "应急类"],
    []
  );

  const suggestionsByCategory = useMemo(() => {
    const map = new Map<SuggestionCategory, KnowledgeEntry[]>();
    for (const c of categoriesInOrder) map.set(c, []);
    for (const entry of knowledgeBase) {
      const arr = map.get(entry.category);
      if (arr) arr.push(entry);
    }
    return map;
  }, [knowledgeBase, categoriesInOrder]);

  return (
    <div className="w-full h-full bg-black text-white">
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
          <section className="flex-1 lg:basis-1/3">
            <div className="rounded-xl border border-white/15 bg-white/5 p-4">
              <div className="mb-4 rounded-xl border border-white/20 bg-black/40 p-3">
                <h2 className="text-[20px] font-semibold">为你推荐</h2>
                <p className="mt-1 text-sm text-white/70">
                  基于当前状态自动识别：优先展示最可能任务
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {personalized.candidates.map((candidate) => {
                    const mapped = taskToKnowledgeEntry(candidate.task);
                    return (
                      <button
                        key={candidate.task}
                        type="button"
                        onClick={() => handleSuggestionClick(mapped)}
                        className="rounded-xl border border-white bg-white px-3 py-3 text-left text-black"
                      >
                        <p className="text-[20px] font-bold">{candidate.task}</p>
                        <p className="mt-1 text-sm text-black/80">
                          依据：{candidate.reasons[0]}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-white/70">
                  困惑度：{personalized.confusionLevel}
                  {personalized.needSimpleMode
                    ? "（已切换简化引导模式）"
                    : "（标准模式）"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-white" />
                <h2 className="text-[20px] font-semibold">猜你想问</h2>
              </div>
              <p className="mt-1 text-sm text-white/70">
                点击词条可直接获得答案
              </p>

              <div className="mt-4 space-y-4">
                {categoriesInOrder.map((category) => {
                  const entries = suggestionsByCategory.get(category) ?? [];
                  if (!entries.length) return null;
                  const displayedEntries = personalized.needSimpleMode
                    ? entries.slice(0, 1)
                    : entries;

                  return (
                    <div key={category}>
                      <div className="mb-2">
                        <span className="inline-block rounded-md border border-white/20 bg-black/30 px-3 py-1 text-sm font-medium">
                          {category}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {displayedEntries.map((entry) => (
                          <button
                            key={entry.prompt}
                            type="button"
                            onClick={() => handleSuggestionClick(entry)}
                            className={[
                              "min-h-[64px] w-full rounded-xl border",
                              "border-white/25 bg-white text-black",
                              "px-3 py-3 text-left",
                              "text-[18px] font-semibold leading-snug",
                              "hover:bg-white/90 active:bg-white/80",
                            ].join(" ")}
                          >
                            {entry.prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex-1 lg:basis-2/3">
            <div className="flex h-full flex-col rounded-xl border border-white/15 bg-white/5">
              <div className="border-b border-white/10 px-4 py-3">
                <h2 className="text-[20px] font-semibold">对话展示区</h2>
                <p className="mt-1 text-sm text-white/70">
                  文字简洁易读，支持流程引导
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={[
                        "flex",
                        m.role === "user" ? "justify-end" : "justify-start",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3",
                          m.role === "user"
                            ? "bg-white text-black"
                            : "bg-black/40 text-white border border-white/10",
                        ].join(" ")}
                      >
                        <p className="text-[16px] leading-relaxed">{m.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </div>

              <div className="border-t border-white/10 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-white/70">语音交互区</span>
                    <span className="mt-1 text-[18px] font-semibold">
                      {isRecording ? "正在录音" : "点击说话"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className="hidden sm:flex items-end gap-1"
                      aria-hidden
                    >
                      <Volume2 size={16} className="opacity-70" />
                      <div className="flex h-[28px] items-end gap-1">
                        {new Array(5).fill(0).map((_, i) => {
                          const base = volume * 28;
                          const amp = 0.55 + i * 0.12;
                          const h = Math.max(4, Math.min(28, base * amp));
                          return (
                            <div
                              key={i}
                              className={[
                                "w-[6px] rounded-sm bg-white/80",
                                "transition-[height] duration-150",
                                isRecording ? "opacity-100" : "opacity-30",
                              ].join(" ")}
                              style={{ height: h }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSpeechToggle}
                      className={[
                        "relative flex items-center justify-center overflow-hidden rounded-2xl border",
                        isRecording
                          ? "border-red-300 bg-red-500 text-white"
                          : "border-white/25 bg-white text-black",
                        "min-h-[72px] min-w-[160px] px-6 py-3",
                      ].join(" ")}
                    >
                      {isRecording ? (
                        <>
                          <span className="absolute inset-0 rounded-2xl animate-ping bg-red-400/30" />
                          <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-red-400/20 to-transparent" />
                        </>
                      ) : null}

                      <div className="relative z-10 flex items-center gap-3">
                        {isRecording ? (
                          <MicOff size={26} />
                        ) : (
                          <Mic size={26} />
                        )}
                        <span className="text-[22px] font-bold leading-none">
                          {isRecording ? "停止" : "点击说话"}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs text-white/60">
                  说明：本 MVP 目前用知识库模拟回复；未来可替换为真实语音识别与 AI 接口。
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

