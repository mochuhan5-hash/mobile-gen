import type { DoctorCandidate, Recommendation } from "./mock-hospital-data";
import { getDashscopeApiKey } from "./ai-config";

type QwenMessage = {
  role: "system" | "user";
  content: string;
};

export type AiExamItem = {
  name: string;
  location: string;
  prep: string;
  needFasting: boolean;
  queueMinutes: number;
  distanceMeters: number;
};

export type AiMedicineItem = {
  name: string;
  spec: string;
  qty: number;
  price: number;
};

export type AiClinicalPlan = {
  recommendation: Recommendation;
  doctors: DoctorCandidate[];
  exams: AiExamItem[];
  medicines: AiMedicineItem[];
};

const planCache = new Map<string, AiClinicalPlan>();

/**
 * 安全解析文本中的 JSON 对象。
 */
function safeParseJsonFromText(text: string): Record<string, unknown> | null {
  const raw = text.trim();
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

/**
 * 规范化医生候选。
 */
function normalizeDoctors(input: unknown): DoctorCandidate[] {
  const list = Array.isArray(input) ? input : [];
  const normalized = list
    .map((item) => {
      const row = item as Partial<DoctorCandidate>;
      const name = String(row.name ?? "").trim();
      const title = String(row.title ?? "").trim() as DoctorCandidate["title"];
      const specialty = String(row.specialty ?? "").trim();
      if (!name || !title || !specialty) return null;
      const nextSlot = String(row.nextSlot ?? "10:30").trim();
      const waitMinutes = Math.max(5, Number(row.waitMinutes ?? 20) || 20);
      const authorityScore = Math.max(60, Math.min(99, Number(row.authorityScore ?? 85) || 85));
      const distanceMeters = Math.max(50, Number(row.distanceMeters ?? 180) || 180);
      const years = Math.max(3, Number(row.years ?? 12) || 12);
      const consultationFee = Math.max(10, Number(row.consultationFee ?? 50) || 50);
      if (title !== "主任医师" && title !== "副主任医师" && title !== "主治医师") return null;
      return {
        name,
        title,
        nextSlot,
        waitMinutes,
        authorityScore,
        distanceMeters,
        specialty,
        years,
        consultationFee,
      } as DoctorCandidate;
    })
    .filter((x): x is DoctorCandidate => Boolean(x));
  return normalized.slice(0, 3);
}

/**
 * 规范化检查项目。
 */
function normalizeExams(input: unknown): AiExamItem[] {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((item) => {
      const row = item as Partial<AiExamItem>;
      const name = String(row.name ?? "").trim();
      const location = String(row.location ?? "").trim();
      if (!name || !location) return null;
      return {
        name,
        location,
        prep: String(row.prep ?? "按现场指引准备").trim(),
        needFasting: Boolean(row.needFasting),
        queueMinutes: Math.max(5, Number(row.queueMinutes ?? 12) || 12),
        distanceMeters: Math.max(50, Number(row.distanceMeters ?? 120) || 120),
      } as AiExamItem;
    })
    .filter((x): x is AiExamItem => Boolean(x))
    .slice(0, 6);
}

/**
 * 规范化药品清单。
 */
function normalizeMedicines(input: unknown): AiMedicineItem[] {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((item) => {
      const row = item as Partial<AiMedicineItem>;
      const name = String(row.name ?? "").trim();
      if (!name) return null;
      return {
        name,
        spec: String(row.spec ?? "常规规格").trim(),
        qty: Math.max(1, Number(row.qty ?? 1) || 1),
        price: Math.max(1, Number(row.price ?? 20) || 20),
      } as AiMedicineItem;
    })
    .filter((x): x is AiMedicineItem => Boolean(x))
    .slice(0, 6);
}

/**
 * 根据症状调用千问，生成推荐科室、医生、检查与药品方案。
 */
export async function getQwenClinicalPlan(symptom: string): Promise<AiClinicalPlan | null> {
  const s = symptom.trim();
  if (!s) return null;
  const cacheKey = s.toLowerCase();
  const cached = planCache.get(cacheKey);
  if (cached) return cached;

  const apiKey = getDashscopeApiKey();
  if (!apiKey) return null;

  const messages: QwenMessage[] = [
    {
      role: "system",
      content:
        "你是医院一体机临床流程推荐助手。仅输出JSON对象，不要输出其它文本。" +
        "字段必须包含 recommendation, doctors, exams, medicines。" +
        "recommendation字段包含: department, reason, doctorHint, queueHint。" +
        "doctors为3个医生对象数组，字段: name,title,nextSlot,waitMinutes,authorityScore,distanceMeters,specialty,years,consultationFee。" +
        "title只能是: 主任医师/副主任医师/主治医师。" +
        "exams为2-6个检查项，字段: name,location,prep,needFasting,queueMinutes,distanceMeters。" +
        "medicines为2-6个药品，字段: name,spec,qty,price。" +
        "请基于患者症状给出合理、真实、可执行的门诊方案。" +
        "默认医院场景固定为上海新华医院，所有内容应使用院内已知信息，不要让用户去官网或导诊台查询。",
    },
    {
      role: "user",
      content: `患者症状：${s}`,
    },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
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
        messages,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = safeParseJsonFromText(content);
    if (!parsed) return null;

    const recRaw = (parsed.recommendation ?? {}) as Partial<Recommendation>;
    const department = String(recRaw.department ?? "").trim();
    if (!department) return null;
    const recommendation: Recommendation = {
      department,
      reason: String(recRaw.reason ?? "上海新华医院建议先按推荐科室就诊。").trim(),
      doctorHint: String(recRaw.doctorHint ?? "上海新华医院建议先由普通门诊医生初步评估。").trim(),
      queueHint: String(recRaw.queueHint ?? "预计候诊 15-30 分钟。").trim(),
    };

    const doctors = normalizeDoctors(parsed.doctors);
    const exams = normalizeExams(parsed.exams);
    const medicines = normalizeMedicines(parsed.medicines);
    if (!doctors.length || !exams.length || !medicines.length) return null;

    const plan: AiClinicalPlan = { recommendation, doctors, exams, medicines };
    planCache.set(cacheKey, plan);
    return plan;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

