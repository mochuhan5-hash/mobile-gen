import { NextRequest, NextResponse } from "next/server";
import { buildMockJourneyData, recommendBySymptom, Recommendation } from "../../../lib/mock-hospital-data";
import { getQwenClinicalPlan } from "../../../lib/qwen-clinical-plan";
import { getDashscopeApiKey } from "../../../lib/ai-config";

type VoiceIntent = "symptom" | "faq";
type ReplyLang = "zh" | "en";
type VoiceMode = "intent" | "suggestions";

type VoiceIntentResult = {
  intent: VoiceIntent;
  symptom: string;
  answer: string;
  suggestions: string[];
  department?: string;
  reason?: string;
  doctorHint?: string;
  queueHint?: string;
};

type VoiceContext = {
  pathname?: string;
  task?: string;
  stage?: string;
  symptom?: string;
  department?: string;
};

const HOSPITAL_NAME_ZH = "上海新华医院";
const HOSPITAL_NAME_EN = "Shanghai Xinhua Hospital";

/**
 * 统一处理 AI 文本，避免出现“去官网/导诊台查询”类话术。
 */
function sanitizeHospitalKnownInfoText(text: string, lang: ReplyLang): string {
  const raw = String(text ?? "").trim();
  if (!raw) return raw;
  const forbidden = /(官网|网站|导诊台|前台|information desk|front desk|official website|hospital website)/gi;
  if (!forbidden.test(raw)) return raw;
  return lang === "en"
    ? `Based on ${HOSPITAL_NAME_EN} in-system information, I can provide the exact next step directly.`
    : `基于${HOSPITAL_NAME_ZH}院内已知信息，我可直接给出具体办理位置和下一步操作。`;
}

type DepartmentMatchResult = {
  department: string;
  score: number;
};

const DEPARTMENT_ALIAS_MAP: Record<string, string[]> = {
  神经内科: ["神经内科", "神内", "neurology", "neuro"],
  心血管内科: ["心血管内科", "心内科", "心内", "cardiology", "cardio"],
  消化内科: ["消化内科", "消化科", "胃肠科", "gastroenterology", "gi clinic"],
  耳鼻咽喉科: ["耳鼻咽喉科", "耳鼻喉科", "耳鼻喉", "ent"],
  眼科: ["眼科", "ophthalmology", "eye clinic"],
  皮肤科: ["皮肤科", "dermatology", "skin clinic"],
  骨科: ["骨科", "orthopedics", "ortho"],
  泌尿外科: ["泌尿外科", "泌尿科", "urology"],
  妇科: ["妇科", "产科", "妇产科", "gynecology", "gyn", "obstetrics", "obgyn"],
  儿科: ["儿科", "小儿科", "pediatrics", "pediatric"],
  发热门诊: ["发热门诊", "发热", "fever clinic"],
  急诊医学科: ["急诊", "急诊医学科", "emergency", "er"],
  精神心理科: ["精神心理科", "心理科", "精神科", "mental health", "psychiatry", "psychology"],
  全科医学科: ["全科", "全科医学科", "general practice", "gp clinic"],
};

/**
 * 判断是否包含“挂号某科”类表达。
 */
function looksLikeDepartmentRegisterIntent(text: string): boolean {
  const lower = text.toLowerCase();
  const intentWords = ["挂号", "挂", "想挂", "预约", "看", "科", "门诊", "register", "appointment", "book", "clinic", "department"];
  return intentWords.some((k) => text.includes(k) || lower.includes(k));
}

/**
 * 基于别名命中与文本包含关系，匹配最相近科室。
 */
function matchDepartmentBySimilarity(text: string): DepartmentMatchResult | null {
  const lower = text.toLowerCase();
  let best: DepartmentMatchResult | null = null;
  for (const [department, aliases] of Object.entries(DEPARTMENT_ALIAS_MAP)) {
    let score = 0;
    for (const alias of aliases) {
      const a = alias.toLowerCase();
      const directHit = text.includes(alias) || lower.includes(a);
      if (directHit) {
        score = Math.max(score, alias.length >= 3 ? 100 : 90);
        continue;
      }
      // 简单前缀与缩写相似度兜底（如“心内”->“心血管内科”）
      if (a.length >= 2 && (lower.includes(a.slice(0, 2)) || text.includes(alias.slice(0, 2)))) {
        score = Math.max(score, 60);
      }
    }
    if (!best || score > best.score) {
      best = { department, score };
    }
  }
  if (!best || best.score < 60) return null;
  return best;
}

/**
 * 生成“按科室挂号意图”对应推荐结果。
 */
function buildDepartmentIntentRecommendation(
  text: string,
  lang: ReplyLang
): { symptom: string; department: string; reason: string; doctorHint: string; queueHint: string } | null {
  if (!looksLikeDepartmentRegisterIntent(text)) return null;
  const matched = matchDepartmentBySimilarity(text);
  if (!matched) return null;
  if (lang === "en") {
    return {
      symptom: text,
      department: matched.department,
      reason: `${HOSPITAL_NAME_EN}: matched your request to the closest department ${matched.department}.`,
      doctorHint: `${HOSPITAL_NAME_EN}: doctors in ${matched.department} are prepared for registration recommendation.`,
      queueHint: "Estimated wait 15-35 min based on current outpatient load.",
    };
  }
  return {
    symptom: text,
    department: matched.department,
    reason: `${HOSPITAL_NAME_ZH}：已按你的挂号需求匹配相似度最高科室为${matched.department}。`,
    doctorHint: `${HOSPITAL_NAME_ZH}：已为你匹配${matched.department}可挂号医生。`,
    queueHint: "结合当前门诊负载，预计候诊 15-35 分钟。",
  };
}

/**
 * 基于上下文推断当前推荐科室。
 */
function resolveContextDepartment(context: VoiceContext | undefined, text: string): string {
  const fromContext = String(context?.department ?? "").trim();
  if (fromContext) return fromContext;
  const rec = recommendBySymptom(text);
  return rec.department;
}

/**
 * 依据症状与科室构建当前院内流程数据（用于位置回答）。
 */
function buildContextJourney(context: VoiceContext | undefined, text: string) {
  const symptom = String(context?.symptom ?? "").trim() || text.trim() || "发热咳嗽";
  const department = resolveContextDepartment(context, symptom);
  const forcedRecommendation: Recommendation = {
    department,
    reason: `${HOSPITAL_NAME_ZH}：按当前症状匹配推荐科室`,
    doctorHint: `${HOSPITAL_NAME_ZH}建议：请按推荐科室完成后续流程`,
    queueHint: "预计候诊 15-30 分钟。",
  };
  return buildMockJourneyData(
    symptom,
    {
      hasPendingCheckIn: true,
      unpaidOrderCount: 1,
      reportReadyCount: 1,
      queueStatus: "未排队",
      needsHumanAssist: false,
    },
    { forcedRecommendation, lang: "zh" }
  );
}

/**
 * 识别“签到地点”相关问题。
 */
function asksCheckInLocation(text: string): boolean {
  const lower = text.toLowerCase();
  const zh = ["去哪里签到", "在哪签到", "怎么签到", "签到在哪", "签到位置", "签到地点"];
  const en = ["where to check in", "check in where", "where should i check in", "check-in location"];
  return [...zh, ...en].some((k) => text.includes(k) || lower.includes(k));
}

/**
 * 识别“检查地点”相关问题（含 CT/MRI/超声/抽血等）。
 */
function asksExamLocation(text: string): boolean {
  const lower = text.toLowerCase();
  const zh = ["去哪里做检查", "检查去哪做", "检查地点", "ct", "mri", "dr", "彩超", "抽血", "检验科"];
  const en = ["where to do exam", "where is exam", "where to do ct", "ct room", "mri room", "ultrasound", "lab"];
  return [...zh, ...en].some((k) => text.includes(k) || lower.includes(k));
}

/**
 * 在检查清单里按关键词选最匹配的检查地点。
 */
function pickExamLocationByQuestion(text: string, examItems: Array<{ name: string; location: string }>): {
  itemName: string;
  location: string;
} {
  const q = text.toLowerCase();
  const hit = (keys: string[]) => keys.some((k) => q.includes(k) || text.includes(k));
  const first = examItems[0] ?? { name: "检查项目", location: "检验科 1F" };

  if (hit(["ct", "dr", "x光", "x-ray", "影像"])) {
    const item = examItems.find((x) => /dr|ct|x|影像/i.test(x.name)) ?? first;
    return { itemName: item.name, location: item.location };
  }
  if (hit(["mri", "核磁"])) {
    const item = examItems.find((x) => /mri|核磁/i.test(x.name)) ?? first;
    return { itemName: item.name, location: item.location };
  }
  if (hit(["彩超", "ultrasound", "超声"])) {
    const item = examItems.find((x) => /超声|ultrasound/i.test(x.name)) ?? first;
    return { itemName: item.name, location: item.location };
  }
  if (hit(["抽血", "血常规", "检验", "lab", "blood"])) {
    const item = examItems.find((x) => /血|检验|lab/i.test(x.name + x.location)) ?? first;
    return { itemName: item.name, location: item.location };
  }
  return { itemName: first.name, location: first.location };
}

/**
 * 基于院内流程上下文生成“位置类 FAQ”回答。
 */
function localLocationAnswer(text: string, lang: ReplyLang, context?: VoiceContext): string | null {
  const journey = buildContextJourney(context, text);

  if (asksCheckInLocation(text)) {
    if (lang === "en") {
      return `${HOSPITAL_NAME_EN}: please go to ${journey.appointment.department} (${journey.appointment.room}) for on-site check-in, then wait for your call number at the department waiting area.`;
    }
    return `${HOSPITAL_NAME_ZH}：请前往${journey.appointment.department}${journey.appointment.room}现场签到，并在对应科室候诊区等待叫号就诊。`;
  }

  if (asksExamLocation(text)) {
    const picked = pickExamLocationByQuestion(
      text,
      journey.examPlan.items.map((item) => ({ name: item.name, location: item.location }))
    );
    if (lang === "en") {
      return `${HOSPITAL_NAME_EN}: your matched exam item "${picked.itemName}" is arranged at ${picked.location}. Please follow the printed exam order on screen.`;
    }
    return `${HOSPITAL_NAME_ZH}：你当前匹配的检查项目“${picked.itemName}”在${picked.location}办理，请按系统给出的检查顺序前往。`;
  }

  return null;
}

/**
 * 判断文本是否主要在询问流程/操作问题。
 */
function looksLikeProcessQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  const faqHints = [
    "怎么",
    "如何",
    "怎样",
    "能不能",
    "是否可以",
    "哪里",
    "在哪",
    "流程",
    "步骤",
    "打印",
    "缴费",
    "退费",
    "发票",
    "时间",
    "多久",
    "报告",
    "结果",
    "how",
    "what",
    "where",
    "when",
    "can i",
    "could i",
    "process",
    "step",
    "print",
    "payment",
    "refund",
    "invoice",
    "report",
    "result",
  ];
  return faqHints.some((k) => text.includes(k) || lower.includes(k));
}

/**
 * 判断是否为“挂什么科/哪个科室”类分诊问句。
 */
function looksLikeDepartmentTopic(text: string): boolean {
  const lower = text.toLowerCase();
  const keywords = [
    "挂什么科",
    "挂哪科",
    "什么科室",
    "哪个科室",
    "该挂什么科",
    "挂号科室",
    "which department",
    "what department",
    "which clinic",
    "what clinic",
    "what should i register",
  ];
  return keywords.some((k) => text.includes(k) || lower.includes(k));
}

/**
 * 本地规则兜底：判断输入是否为症状类。
 */
function looksLikeSymptom(text: string): boolean {
  const lower = text.toLowerCase();
  const symptomKeywords = [
    "疼",
    "痛",
    "发烧",
    "发热",
    "咳嗽",
    "胸闷",
    "心慌",
    "头晕",
    "头痛",
    "腹痛",
    "腹泻",
    "呕吐",
    "皮疹",
    "瘙痒",
    "尿频",
    "尿急",
    "呼吸困难",
    "pain",
    "ache",
    "fever",
    "headache",
    "dizzy",
    "dizziness",
    "cough",
    "sore throat",
    "chest pain",
    "chest tightness",
    "shortness of breath",
    "stomachache",
    "abdominal pain",
    "diarrhea",
    "vomit",
    "rash",
    "itch",
    "urinary frequency",
    "urinary urgency",
    "flu",
    "cold",
    "hypertension",
    "diabetes",
    "migraine",
    "asthma",
    "infection",
    "gastroenteritis",
    "fracture",
    "pregnant",
    "pregnancy",
    "morning sickness",
    "lower abdominal cramp",
    "lower abdomen cramp",
    "irregular period",
    "irregular menstruation",
    "hair loss",
    "acne",
    "pimple",
    "breakout",
    "感冒",
    "流感",
    "高血压",
    "糖尿病",
    "偏头痛",
    "哮喘",
    "感染",
    "胃肠炎",
    "骨折",
    "怀孕",
    "妊娠",
    "孕吐",
    "小腹绞痛",
    "生理期混乱",
    "月经紊乱",
    "经期紊乱",
    "脱发",
    "掉发",
    "长痘",
    "痘痘",
    "闭口",
    "粉刺",
    "想死",
    "自杀",
    "不想活",
    "活不下去",
    "跳楼",
    "杀人",
    "伤人",
    "自残",
    "轻生",
    "suicide",
    "suicidal",
    "kill myself",
    "want to die",
    "jump off",
    "homicide",
    "kill someone",
    "hurt someone",
    "self harm",
  ];
  const directHit = symptomKeywords.some((k) => text.includes(k) || lower.includes(k));
  if (directHit) return true;

  // 第一人称 + 不适描述，视为症状表达（宁可多跳转，不漏识别）。
  const selfRefs = ["我", "本人", "自己", "我这", "i ", "i'm", "ive", "i've", "my "];
  const conditionWords = [
    "不舒服",
    "难受",
    "不适",
    "有点",
    "一直",
    "这两天",
    "最近",
    "症状",
    "感觉",
    "有",
    "sick",
    "unwell",
    "feel",
    "feeling",
    "have",
    "having",
    "since",
    "for days",
    "for weeks",
    "symptom",
  ];
  const hasSelfRef = selfRefs.some((k) => text.includes(k) || lower.includes(k));
  const hasCondition = conditionWords.some((k) => text.includes(k) || lower.includes(k));
  return hasSelfRef && hasCondition;
}

/**
 * 本地 FAQ 兜底回答。
 */
function localFaqAnswer(text: string, lang: ReplyLang, context?: VoiceContext): string {
  const locationAnswer = localLocationAnswer(text, lang, context);
  if (locationAnswer) return locationAnswer;
  const lower = text.toLowerCase();
  if (lang === "en") {
    if (text.includes("机器") || text.includes("怎么用") || lower.includes("how to use") || lower.includes("kiosk")) {
      return `At ${HOSPITAL_NAME_EN}, please insert your insurance card or scan the insurance QR at kiosk first, then follow on-screen guidance.`;
    }
    if (text.includes("缴费") || lower.includes("pay") || lower.includes("payment")) {
      return `${HOSPITAL_NAME_EN}: check fee details, tap Pay, and print receipt at the same kiosk after success.`;
    }
    if (text.includes("报告") || text.includes("结果") || lower.includes("report") || lower.includes("result")) {
      return `At ${HOSPITAL_NAME_EN}, open Results page to view abnormal items first, then print the exam sheet directly.`;
    }
    if (text.includes("科室") || text.includes("在哪") || lower.includes("department") || lower.includes("where")) {
      return `Describe your symptoms and I will match department and doctor in ${HOSPITAL_NAME_EN} directly, including room location.`;
    }
      return `Got it. Based on ${HOSPITAL_NAME_EN} in-system data, I can provide exact next steps and locations for your request.`;
  }
  if (text.includes("机器") || text.includes("怎么用") || lower.includes("how to use") || lower.includes("kiosk")) {
    return `在${HOSPITAL_NAME_ZH}，请先插医保卡或扫医保码，再按屏幕提示操作。`;
  }
  if (text.includes("缴费") || lower.includes("pay") || lower.includes("payment")) {
    return `在${HOSPITAL_NAME_ZH}自助机上，先核对费用明细，再点击去缴费，支付成功后可直接打印票据。`;
  }
  if (text.includes("报告") || text.includes("结果") || lower.includes("report") || lower.includes("result")) {
    return `在${HOSPITAL_NAME_ZH}流程中，检查完成后进入“检查结果已出”页面，先看异常项再打印检查单。`;
  }
  if (text.includes("科室") || text.includes("在哪") || lower.includes("department") || lower.includes("where")) {
    return `你直接描述症状即可，我会按${HOSPITAL_NAME_ZH}院内信息自动推荐科室、医生和诊室位置。`;
  }
  return `已收到你的问题。我会基于${HOSPITAL_NAME_ZH}院内已知信息，直接给你下一步办理流程与位置。`;
}

/**
 * 本地兜底推荐词：根据最近一次提问生成 5 个候选。
 */
function localSuggestions(text: string, lang: ReplyLang): string[] {
  const t = text.trim();
  const lower = t.toLowerCase();
  const englishPrefer = lang === "en";
  if (!t) {
    return englishPrefer
      ? ["Headache", "Abdominal pain", "Fever", "Cough", "Payment"]
      : ["头痛", "腹痛", "发热", "咳嗽", "缴费"];
  }
  if (looksLikeSymptom(t)) {
    if (englishPrefer || /^[\x00-\x7F\s.,!?'"-]+$/.test(t)) {
      return ["Which department", "Need tests", "Need fasting", "Result time", "Find doctor"];
    }
    return ["挂哪科", "做检查", "要空腹", "多久出结果", "找医生"];
  }
  if (t.includes("缴费") || lower.includes("pay") || lower.includes("payment")) {
    if (englishPrefer) return ["Go payment", "Print receipt", "Insurance settlement", "Payment failed", "Next step"];
    return ["去缴费", "打印票据", "医保结算", "支付失败", "下一步"];
  }
  if (t.includes("报告") || t.includes("结果") || lower.includes("report") || lower.includes("result")) {
    if (englishPrefer) return ["View abnormal", "Print sheet", "Book follow-up", "Report time", "Interpret result"];
    return ["查看异常", "打印检查单", "预约复诊", "报告时间", "结果解读"];
  }
  if (t.includes("挂号") || lower.includes("register") || lower.includes("appointment")) {
    if (englishPrefer) return ["Recommended department", "Recommended doctor", "Confirm registration", "Specialist follow-up", "Check-in"];
    return ["推荐科室", "推荐医生", "确认挂号", "专家复诊", "签到"];
  }
  if (englishPrefer || /^[\x00-\x7F\s.,!?'"-]+$/.test(t)) {
    return ["Which department", "How to pay", "Print report", "Exam prep", "Human help"];
  }
  return ["挂哪科", "怎么缴费", "打印报告", "检查准备", "人工协助"];
}

/**
 * 按当前页面流程生成本地兜底推荐问题。
 */
function localFlowSuggestions(context: VoiceContext | undefined, lang: ReplyLang): string[] {
  const stage = String(context?.stage ?? "").toLowerCase();
  const pathname = String(context?.pathname ?? "").toLowerCase();
  const hint = `${stage} ${pathname}`;
  const isEn = lang === "en";

  if (hint.includes("doctor") || hint.includes("recommend")) {
    return isEn
      ? ["Why this doctor", "Any earlier slot", "How to register", "Need payment now", "Can switch doctor"]
      : ["为何推荐该医生", "有没有更早号源", "如何确认挂号", "是否现在缴费", "能否更换医生"];
  }
  if (hint.includes("payment")) {
    return isEn
      ? ["What am I paying", "Can use insurance", "Any missing items", "What after payment", "How to print receipt"]
      : ["本次缴费包含什么", "是否可医保结算", "有无漏项", "缴费后下一步", "如何打印票据"];
  }
  if (hint.includes("check-in") || hint.includes("queue")) {
    return isEn
      ? ["How to check in", "How long to wait", "Where is room", "What if missed", "What next after queue"]
      : ["如何确认签到", "还需等待多久", "诊室位置在哪", "过号怎么办", "候诊后下一步"];
  }
  if (hint.includes("report") || hint.includes("result")) {
    return isEn
      ? ["How to read abnormal", "Need follow-up", "Can print now", "Which doctor for follow-up", "Need recheck"]
      : ["异常结果怎么看", "是否需要复诊", "现在能否打印", "复诊挂哪个医生", "是否需要复查"];
  }
  if (hint.includes("medicine")) {
    return isEn
      ? ["How to confirm medicines", "Any alternatives", "How to pay medicines", "Where to pick up", "Need pharmacist help"]
      : ["如何确认药品清单", "是否有替代药", "如何药品缴费", "去哪里取药", "是否需要药师说明"];
  }
  return isEn
    ? ["Which department", "Recommend doctor", "How to pay", "How to print report", "Need human assistance"]
    : ["挂哪个科室", "推荐哪位医生", "怎么缴费", "怎么打印报告", "需要人工协助吗"];
}

/**
 * 用千问生成“当前页面流程联想问题”。
 */
async function suggestWithQwen(params: {
  apiKey: string;
  lang: ReplyLang;
  context?: VoiceContext;
  lastQuestion?: string;
}): Promise<string[] | null> {
  const { apiKey, lang, context, lastQuestion } = params;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const resp = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen-plus",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "你是医院一体机语音联想问题助手。仅输出JSON：{suggestions:string[]}。" +
              "返回3到5个问题，简短、具体、可点击。" +
              `默认场景固定为${HOSPITAL_NAME_ZH}，问题应基于院内已知信息，不要建议用户去官网或导诊台查询。` +
              (lang === "en"
                ? "当前语言是英文，suggestions必须英文。"
                : "当前语言是中文，suggestions必须中文。"),
          },
          {
            role: "user",
            content: JSON.stringify({
              context: context ?? {},
              lastQuestion: lastQuestion ?? "",
            }),
          },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : raw;
    const parsed = JSON.parse(jsonText) as { suggestions?: unknown };
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
      : [];
    return suggestions.length >= 3 ? suggestions : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 尝试用千问判断意图并生成回答。
 */
async function analyzeWithQwen(text: string, apiKey: string, lang: ReplyLang): Promise<VoiceIntentResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen-plus",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "你是医院一体机意图识别助手。请仅输出JSON：{intent,symptom,answer,suggestions}。" +
              "intent只能是 symptom 或 faq。" +
              "若为symptom，answer留空，symptom写规范化症状短语；" +
              "若为faq，symptom留原文，answer给一句简洁明确回复。" +
              "suggestions 必须是长度为 5 的字符串数组，基于用户本次提问推荐下一步问题。" +
              "每个建议尽量简短。" +
              `默认医院场景是${HOSPITAL_NAME_ZH}，请基于院内已知信息直接回答，不要让用户去官网或导诊台查询。` +
              (lang === "en"
                ? "当前会话语言为英文，answer 与 suggestions 必须全部英文。若提到症状或不适，intent 必须返回 symptom。"
                : "当前会话语言为中文，answer 与 suggestions 必须全部中文。"),
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : raw;
    const parsed = JSON.parse(jsonText) as Partial<VoiceIntentResult>;
    if (parsed.intent !== "symptom" && parsed.intent !== "faq") return null;
    const suggestionsRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions = suggestionsRaw
      .map((x) => String(x).trim())
      .filter(Boolean)
      .map((x) => sanitizeHospitalKnownInfoText(x, lang))
      .slice(0, 5);
    const paddedSuggestions =
      suggestions.length >= 5
        ? suggestions
        : [...suggestions, ...localSuggestions(text, lang)].slice(0, 5);
    return {
      intent: parsed.intent,
      symptom: String(parsed.symptom ?? text),
      answer: sanitizeHospitalKnownInfoText(String(parsed.answer ?? ""), lang),
      suggestions: paddedSuggestions,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      mode?: VoiceMode;
      text?: string;
      lang?: string;
      context?: VoiceContext;
      lastQuestion?: string;
    };
    const mode: VoiceMode = body.mode === "suggestions" ? "suggestions" : "intent";
    const context = body.context;
    const text = String(body.text ?? "").trim();
    const lang: ReplyLang = body.lang === "en" ? "en" : "zh";
    const apiKey = getDashscopeApiKey();

    if (mode === "suggestions") {
      if (apiKey) {
        const aiSuggestions = await suggestWithQwen({
          apiKey,
          lang,
          context,
          lastQuestion: body.lastQuestion,
        });
        if (aiSuggestions) {
          return NextResponse.json({
            suggestions: aiSuggestions,
          });
        }
      }
      return NextResponse.json({
        suggestions: localFlowSuggestions(context, lang).slice(0, 5),
      });
    }

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const stageHint = String(context?.stage ?? "").toLowerCase();
    const isStageOneFlow = stageHint.includes("recommend") || stageHint.includes("doctor");
    const deptIntentRec = buildDepartmentIntentRecommendation(text, lang);
    if (deptIntentRec) {
      return NextResponse.json({
        intent: "symptom",
        symptom: deptIntentRec.symptom,
        answer: "",
        suggestions: localSuggestions(text, lang),
        department: deptIntentRec.department,
        reason: deptIntentRec.reason,
        doctorHint: deptIntentRec.doctorHint,
        queueHint: deptIntentRec.queueHint,
      } as VoiceIntentResult);
    }
    const symptomLike = looksLikeSymptom(text);
    const processQuestionLike = looksLikeProcessQuestion(text);
    const departmentTopicLike = looksLikeDepartmentTopic(text);
    const forcedSymptomInStageOne = isStageOneFlow && (symptomLike || departmentTopicLike);

    if (forcedSymptomInStageOne) {
      const normalizedSymptom = String(context?.symptom ?? text).trim() || text;
      const aiPlan = await getQwenClinicalPlan(normalizedSymptom);
      const rec = aiPlan?.recommendation ?? recommendBySymptom(normalizedSymptom);
      return NextResponse.json({
        intent: "symptom",
        symptom: normalizedSymptom,
        answer: "",
        suggestions: localSuggestions(normalizedSymptom, lang),
        department: rec.department,
        reason: rec.reason,
        doctorHint: rec.doctorHint,
        queueHint: rec.queueHint,
      } as VoiceIntentResult);
    }

    if (apiKey) {
      const ai = await analyzeWithQwen(text, apiKey, lang);
      if (ai) {
        const aiSymptomLike = looksLikeSymptom(ai.symptom || "");
        // 症状相关务必走挂号推荐链路，避免误判 FAQ。
        if (ai.intent === "symptom" || symptomLike || aiSymptomLike) {
          const normalizedSymptom = String(ai.symptom || text).trim();
          const aiPlan = await getQwenClinicalPlan(normalizedSymptom);
          const rec = aiPlan?.recommendation ?? recommendBySymptom(normalizedSymptom);
          return NextResponse.json({
            ...ai,
            intent: "symptom",
            symptom: normalizedSymptom,
            answer: "",
            department: rec.department,
            reason: rec.reason,
            doctorHint: rec.doctorHint,
            queueHint: rec.queueHint,
          } as VoiceIntentResult);
        }
        // 用户在描述自身不适时，即使 AI 走了 faq，也强制进入挂号推荐。
        if ((!processQuestionLike && symptomLike) || (isStageOneFlow && departmentTopicLike)) {
          const normalizedSymptom = String(ai.symptom || text).trim();
          const aiPlan = await getQwenClinicalPlan(normalizedSymptom);
          const rec = aiPlan?.recommendation ?? recommendBySymptom(normalizedSymptom);
          return NextResponse.json({
            intent: "symptom",
            symptom: normalizedSymptom,
            answer: "",
            suggestions: localSuggestions(normalizedSymptom, lang),
            department: rec.department,
            reason: rec.reason,
            doctorHint: rec.doctorHint,
            queueHint: rec.queueHint,
          } as VoiceIntentResult);
        }
        if (lang === "en" && /[\u4e00-\u9fff]/.test(ai.answer || "")) {
          return NextResponse.json({
            ...ai,
            answer: localFaqAnswer(text, "en", context),
            suggestions: localSuggestions(text, "en"),
          } as VoiceIntentResult);
        }
        if (ai.intent === "faq") {
          const preciseLocationAnswer = localLocationAnswer(text, lang, context);
          if (preciseLocationAnswer) {
            return NextResponse.json({
              ...ai,
              answer: preciseLocationAnswer,
            } as VoiceIntentResult);
          }
        }
        return NextResponse.json(ai);
      }
    }

    // 兜底逻辑
    if (looksLikeSymptom(text)) {
      const aiPlan = await getQwenClinicalPlan(text);
      const rec = aiPlan?.recommendation ?? recommendBySymptom(text);
      return NextResponse.json({
        intent: "symptom",
        symptom: text,
        answer: "",
        suggestions: localSuggestions(text, lang),
        department: rec.department,
        reason: rec.reason,
        doctorHint: rec.doctorHint,
        queueHint: rec.queueHint,
      } as VoiceIntentResult);
    }
    return NextResponse.json({
      intent: "faq",
      symptom: text,
      answer: localFaqAnswer(text, lang, context),
      suggestions: localSuggestions(text, lang),
    } as VoiceIntentResult);
  } catch {
    return NextResponse.json(
      {
        intent: "faq",
        symptom: "",
        answer: "System is busy. Please try again later.",
        suggestions: localSuggestions("", "en"),
      } as VoiceIntentResult,
      { status: 200 }
    );
  }
}

