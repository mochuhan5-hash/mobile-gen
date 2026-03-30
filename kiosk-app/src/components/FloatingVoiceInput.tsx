"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, X } from "lucide-react";
import { useLanguage } from "../lib/use-language";
import { writeJourneyProgress } from "../lib/journey-progress";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

/**
 * 全局悬浮语音输入入口。
 * 语音后自动识别意图：症状类跳转推荐医生；常规问题直接回复答案。
 */
export default function FloatingVoiceInput() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [smartOptions, setSmartOptions] = useState<string[]>([
    "头痛头晕",
    "腹痛腹泻",
    "发热咳嗽",
    "胸闷心慌",
    "皮疹瘙痒",
  ]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const latestInputRef = useRef("");
  const lastQuestionRef = useRef("");
  const displayOptions = lang === "zh"
    ? smartOptions
    : smartOptions.map((item) => {
        const map: Record<string, string> = {
          "头痛头晕": "Headache",
          "腹痛腹泻": "Abdominal pain",
          "发热咳嗽": "Fever & cough",
          "胸闷心慌": "Chest discomfort",
          "皮疹瘙痒": "Rash & itch",
          "怎么缴费": "How to pay",
          "怎么打印报告": "Print report",
          "挂哪科": "Which department",
          "去缴费": "Go pay",
          "查看异常": "View abnormal",
          "打印检查单": "Print form",
          "预约复诊": "Book follow-up",
        };
        const mapped = map[item];
        if (mapped) return mapped;
        return /[\u4e00-\u9fff]/.test(item) ? "Follow-up question" : item;
      });

  /**
   * 推荐医生页联想问题：前两项固定“更权威/更快就诊”，其余按相关性补齐。
   */
  const mergeDoctorTopSuggestions = (suggestions: string[]): string[] => {
    const fixedTop =
      lang === "zh"
        ? ["想要更权威的医生", "想要更快就诊"]
        : ["I want a more authoritative doctor", "I want the fastest appointment"];

    const normalized = suggestions
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => {
        const lower = item.toLowerCase();
        return !fixedTop.some((fixed) => fixed.toLowerCase() === lower);
      });

    return [...fixedTop, ...normalized].slice(0, 5);
  };

  /**
   * 根据问题文本长度智能计算推荐项宽度，确保完整展示且字号不变。
   */
  const getSuggestionWidth = (text: string): number => {
    const chars = Array.from(text);
    const weight = chars.reduce((sum, ch) => sum + (/[\u4e00-\u9fff]/.test(ch) ? 1.8 : 1), 0);
    // 13px 字号下每单位字符约 8~9px，附加左右内边距后做范围约束。
    const raw = Math.round(weight * 8.6 + 28);
    return Math.min(360, Math.max(92, raw));
  };

  /**
   * 是否为“想看更权威/专家医生”类提问。
   */
  const wantsAuthoritativeDoctors = (text: string): boolean => {
    const q = text.trim().toLowerCase();
    const keywords = [
      "更权威",
      "权威医生",
      "专家",
      "主任医师",
      "最好的医生",
      "更资深",
      "authoritative",
      "senior doctor",
      "specialist",
      "expert doctor",
      "best doctor",
    ];
    return keywords.some((k) => q.includes(k));
  };

  /**
   * 是否为“想更快就诊/最早号源”类提问。
   */
  const wantsFasterDoctors = (text: string): boolean => {
    const q = text.trim().toLowerCase();
    const keywords = [
      "更快",
      "尽快就诊",
      "最快",
      "最早号源",
      "早一点",
      "马上能看",
      "快一点",
      "faster",
      "earliest slot",
      "earliest appointment",
      "as soon as possible",
      "soonest",
      "quick doctor",
    ];
    return keywords.some((k) => q.includes(k));
  };

  /**
   * 是否为“换一个医生/重新推荐医生”类提问。
   */
  const wantsAnotherDoctor = (text: string): boolean => {
    const q = text.trim().toLowerCase();
    const keywords = [
      "换一个医生",
      "换个医生",
      "换医生",
      "想换医生",
      "我要换医生",
      "帮我换医生",
      "重新推荐医生",
      "重新推荐",
      "重新匹配",
      "再匹配一个医生",
      "再推荐一个医生",
      "再推荐",
      "换一位医生",
      "再来一个医生",
      "另一个医生",
      "再换一个",
      "换一换",
      "换一下",
      "换个更好的",
      "换个更合适的",
      "换个更权威的",
      "换个更快的",
      "这个不合适换一个",
      "重新匹配医生",
      "change doctor",
      "change the doctor",
      "can i change doctor",
      "another doctor",
      "different doctor",
      "switch to another doctor",
      "replace this doctor",
      "not this doctor",
      "recommend another doctor",
      "recommend a different doctor",
      "new doctor",
      "switch doctor",
    ];
    return keywords.some((k) => q.includes(k));
  };

  /**
   * 从当前 URL 推断医生偏好（优先使用 adjustPref，其次 priority）。
   */
  const resolveCurrentDoctorPreference = (): "expert-first" | "time-first" => {
    if (typeof window === "undefined") return "time-first";
    const current = new URL(window.location.href);
    const adjustPref = current.searchParams.get("adjustPref");
    if (adjustPref === "expert-first" || adjustPref === "time-first") return adjustPref;
    const priority = current.searchParams.get("priority");
    return priority === "expert-first" ? "expert-first" : "time-first";
  };

  /**
   * 处理推荐医生“偏好调整”：
   * 前两轮：单医生重推荐；第三轮起进入三选一模式。
   * 若本次偏好与上次不同，则从第 1 轮重新计数。
   */
  const applyDoctorAdjustment = (
    pref: "expert-first" | "time-first",
    options?: {
      symptom?: string;
      department?: string;
      reason?: string;
      doctorHint?: string;
      queueHint?: string;
    }
  ) => {
    if (typeof window === "undefined") return;
    const current = new URL(window.location.href);
    const prevPref = current.searchParams.get("adjustPref");
    const countRaw = Number(current.searchParams.get("adjustCount") ?? "0");
    const count = Number.isFinite(countRaw) ? countRaw : 0;
    const nextCount = prevPref && prevPref !== pref ? 1 : count + 1;

    current.searchParams.set("priority", pref);
    current.searchParams.set("adjustPref", pref);
    current.searchParams.set("adjustCount", String(nextCount));
    current.searchParams.delete("selectedDoctor");
    if (options?.symptom) current.searchParams.set("symptom", options.symptom);
    if (options?.department) current.searchParams.set("department", options.department);
    if (options?.reason) current.searchParams.set("reason", options.reason);
    if (options?.doctorHint) current.searchParams.set("doctorHint", options.doctorHint);
    if (options?.queueHint) current.searchParams.set("queueHint", options.queueHint);

    if (nextCount > 2) {
      if (pref === "expert-first") {
        current.searchParams.set("expertList", "1");
        current.searchParams.delete("fastList");
      } else {
        current.searchParams.set("fastList", "1");
        current.searchParams.delete("expertList");
      }
    } else {
      current.searchParams.delete("expertList");
      current.searchParams.delete("fastList");
    }
    router.push(`${current.pathname}?${current.searchParams.toString()}`);
  };

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  /**
   * 根据当前路由生成流程上下文，用于联想推荐问题。
   */
  const buildFlowContext = () => {
    const seg = pathname.split("/").filter(Boolean);
    const task = seg[0] === "tasks" ? seg[1] ?? "" : "";
    const stageMap: Record<string, string> = {
      "/": "home",
      "/register/recommend": "recommend",
      "/register/doctors": "doctor",
    };
    const stage = task
      ? `task-${task}`
      : stageMap[pathname] ?? "general";
    return {
      pathname,
      task,
      stage,
      symptom: typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("symptom") ?? "",
      department:
        typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("department") ?? "",
    };
  };

  /**
   * 打开语音面板时，按当前页面流程拉取联想问题。
   */
  const refreshSuggestionsByContext = async () => {
    try {
      const resp = await fetch("/api/voice-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "suggestions",
          lang,
          context: buildFlowContext(),
          lastQuestion: lastQuestionRef.current,
        }),
      });
      const data = (await resp.json()) as { suggestions?: string[] };
      if (Array.isArray(data.suggestions) && data.suggestions.length >= 3) {
        if (pathname === "/register/doctors") {
          setSmartOptions(mergeDoctorTopSuggestions(data.suggestions));
        } else {
          setSmartOptions(data.suggestions.slice(0, 5));
        }
      }
    } catch {
      // 忽略联想问题刷新异常，不影响主流程。
    }
  };

  /**
   * 获取浏览器语音识别构造器。
   */
  const getSpeechRecognitionCtor = () => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
  };

  /**
   * AI 识别用户意图：症状类跳转推荐医生，常规问题直接给答案。
   */
  const analyzeIntent = async (text: string) => {
    const query = text.trim();
    if (!query) return;

    // 在推荐医生步骤中，若用户明确要更权威医生，直接切换到“权威医生三选一”模式。
    if (pathname === "/register/doctors" && wantsAuthoritativeDoctors(query)) {
      applyDoctorAdjustment("expert-first");
      setOpen(false);
      setInput("");
      setVoiceHint("");
      return;
    }

    // 在推荐医生步骤中，若用户明确要更快就诊医生，切到“最快号源三选一”模式。
    if (pathname === "/register/doctors" && wantsFasterDoctors(query)) {
      applyDoctorAdjustment("time-first");
      setOpen(false);
      setInput("");
      setVoiceHint("");
      return;
    }

    // 在推荐医生步骤中，若用户表达“换一个医生”，按当前偏好进入同样的重推荐轮次机制。
    if (pathname === "/register/doctors" && wantsAnotherDoctor(query)) {
      applyDoctorAdjustment(resolveCurrentDoctorPreference());
      setOpen(false);
      setInput("");
      setVoiceHint("");
      return;
    }

    setQaAnswer("");
    setIsAnalyzing(true);
    try {
      const resp = await fetch("/api/voice-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "intent",
          text: query,
          lang,
          context: buildFlowContext(),
          lastQuestion: lastQuestionRef.current,
        }),
      });
      const data = (await resp.json()) as {
        intent?: "symptom" | "faq";
        symptom?: string;
        answer?: string;
        suggestions?: string[];
        department?: string;
        reason?: string;
        doctorHint?: string;
        queueHint?: string;
      };
      if (Array.isArray(data.suggestions) && data.suggestions.length) {
        if (pathname === "/register/doctors") {
          setSmartOptions(mergeDoctorTopSuggestions(data.suggestions));
        } else {
          setSmartOptions(data.suggestions.slice(0, 5));
        }
      }
      lastQuestionRef.current = query;
      if (data.intent === "symptom") {
        const symptom = (data.symptom || query).trim();
        if (pathname === "/register/doctors") {
          const pref = wantsAuthoritativeDoctors(query)
            ? "expert-first"
            : wantsFasterDoctors(query)
              ? "time-first"
              : resolveCurrentDoctorPreference();
          applyDoctorAdjustment(pref, {
            symptom,
            department: data.department,
            reason: data.reason,
            doctorHint: data.doctorHint,
            queueHint: data.queueHint,
          });
          setOpen(false);
          setInput("");
          setVoiceHint("");
          return;
        }
        const queryParts = [
          `symptom=${encodeURIComponent(symptom)}`,
          "priority=time-first",
        ];
        if (pathname === "/") {
          queryParts.push("flowStage=1");
          writeJourneyProgress({
            nextStage: 1,
            symptom,
            department: data.department ?? "",
            selectedDoctor: "",
            patientName: "",
            patientAge: 46,
            patientGender: "男",
          });
        } else if (typeof window !== "undefined") {
          const currentFlowStage = new URLSearchParams(window.location.search).get("flowStage");
          if (currentFlowStage) {
            queryParts.push(`flowStage=${encodeURIComponent(currentFlowStage)}`);
          }
        }
        if (data.department) queryParts.push(`department=${encodeURIComponent(data.department)}`);
        if (data.reason) queryParts.push(`reason=${encodeURIComponent(data.reason)}`);
        if (data.doctorHint) queryParts.push(`doctorHint=${encodeURIComponent(data.doctorHint)}`);
        if (data.queueHint) queryParts.push(`queueHint=${encodeURIComponent(data.queueHint)}`);
        router.push(`/register/doctors?${queryParts.join("&")}`);
        setOpen(false);
        setInput("");
        setVoiceHint("");
        return;
      }
      setQaAnswer(data.answer || t("已收到你的问题，请再具体描述一下。", "Received. Please describe in more detail."));
    } catch {
      setQaAnswer(t("系统暂时繁忙，请稍后再试。", "System is busy. Please try again later."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 开始麦克风语音识别。
   */
  const startVoiceInput = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceHint(
        t("当前浏览器不支持语音识别，请手动输入。", "Speech recognition is not supported. Please type manually.")
      );
      return;
    }

    try {
      const recognition = new Ctor();
      recognition.lang = lang === "en" ? "en-US" : "zh-CN";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        let finalText = "";
        for (let i = 0; i < event.results.length; i += 1) {
          finalText += event.results[i][0]?.transcript ?? "";
        }
        if (finalText.trim()) setInput(finalText.trim());
      };

      recognition.onerror = (event) => {
        setVoiceHint(`${t("语音识别失败：", "Speech recognition failed: ")}${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const text = latestInputRef.current.trim();
        if (text) void analyzeIntent(text);
      };

      recognitionRef.current = recognition;
      setVoiceHint(t("正在听，请说出需求...", "Listening... Please speak now."));
      setIsListening(true);
      recognition.start();
    } catch {
      setVoiceHint(t("无法启动麦克风，请检查麦克风权限。", "Cannot start microphone. Please check permissions."));
      setIsListening(false);
    }
  };

  /**
   * 停止语音识别。
   */
  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceHint(t("已停止语音输入。", "Voice input stopped."));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void refreshSuggestionsByContext();
        }}
        className="fixed bottom-6 right-6 z-40 flex min-h-[72px] min-w-[72px] items-center justify-center rounded-full border border-white bg-white text-black shadow-2xl"
        aria-label={t("打开语音输入", "Open voice input")}
      >
        <Mic size={30} />
      </button>
      <button
        type="button"
        onClick={() => setLang(lang === "zh" ? "en" : "zh")}
        className="fixed bottom-6 right-[96px] z-40 flex min-h-[72px] min-w-[72px] items-center justify-center rounded-full border border-white bg-black text-white shadow-2xl"
        aria-label={t("切换语言", "Switch language")}
      >
        <span className="text-[16px] font-bold">{lang === "zh" ? "EN" : "ZH"}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-[560px] rounded-2xl border border-white/20 bg-black p-4 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-bold">{t("请输入您的症状/需求", "Please describe your symptom/request")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/20 p-2 text-white/90"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-2 text-sm text-white/70">
              {t("示例：头疼三天 / 怎么打印报告 / 怎么缴费", "Example: headache / print report / payment")}
            </p>

            <div className="mt-4">
              <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2 py-2">
                <button
                  type="button"
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  className={[
                    "inline-flex h-[48px] w-[48px] items-center justify-center rounded-lg",
                    isListening ? "bg-red-600 text-white" : "bg-white text-black",
                  ].join(" ")}
                  aria-label={isListening ? t("停止语音输入", "Stop voice input") : t("开始语音输入", "Start voice input")}
                >
                  <Mic size={24} />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void analyzeIntent(input);
                  }}
                  placeholder={t("点击麦克风或直接输入需求...", "Tap mic or type your request...")}
                  className="w-full bg-transparent px-2 py-2 text-[20px] outline-none placeholder:text-white/40"
                />
              </div>
              <span className="mt-2 block text-sm text-white/70">{voiceHint}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {displayOptions.map((keyword, index) => (
                <button
                  key={`${keyword}-${index}`}
                  type="button"
                  onClick={() => {
                    const raw = smartOptions[index] ?? keyword;
                    setInput(raw);
                    void analyzeIntent(raw);
                  }}
                  className="rounded-lg border border-white/30 bg-white px-2 py-2 text-center text-[13px] font-semibold text-black"
                  title={keyword}
                  style={{
                    width: `${getSuggestionWidth(keyword)}px`,
                  }}
                >
                  {keyword}
                </button>
              ))}
            </div>

            {isAnalyzing ? <p className="mt-4 text-sm text-white/70">{t("AI 正在识别你的需求...", "AI is understanding your request...")}</p> : null}
            {qaAnswer ? (
              <div className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-sm text-white/70">{t("AI 回复", "AI Reply")}</p>
                <p className="mt-1 text-[18px] text-white">{qaAnswer}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

