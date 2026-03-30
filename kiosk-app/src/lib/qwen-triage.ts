import type { Recommendation } from "./mock-hospital-data";
import { getDashscopeApiKey } from "./ai-config";

type QwenMessage = {
  role: "system" | "user";
  content: string;
};

type QwenChoice = {
  message?: {
    content?: string;
  };
};

type QwenResponse = {
  choices?: QwenChoice[];
};

/**
 * 尝试从文本中提取 JSON 对象。
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
 * 调用千问（Qwen）进行分诊推荐。
 * 若未配置 API Key 或调用失败，会返回 null 由上层走本地规则兜底。
 */
export async function getQwenTriageRecommendation(symptom: string): Promise<Recommendation | null> {
  const apiKey = getDashscopeApiKey();
  if (!apiKey) return null;
  if (!symptom.trim()) return null;

  const messages: QwenMessage[] = [
    {
      role: "system",
      content:
        "你是医院一体机分诊助手。请只返回JSON对象，不要返回其它文本。" +
        "字段必须包含：department, reason, doctorHint, queueHint。" +
        "内容简洁，面向普通患者。" +
        "默认医院场景固定为上海新华医院，请基于院内已知信息给出可执行建议，不要让用户去官网或导诊台查询。",
    },
    {
      role: "user",
      content: `患者症状：${symptom}`,
    },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

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
    const data = (await resp.json()) as QwenResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = safeParseJsonFromText(content);
    if (!parsed) return null;

    const department = String(parsed.department ?? "").trim();
    const reason = String(parsed.reason ?? "").trim();
    const doctorHint = String(parsed.doctorHint ?? "").trim();
    const queueHint = String(parsed.queueHint ?? "").trim();

    if (!department) return null;
    return {
      department,
      reason: reason || "上海新华医院建议先按推荐科室就诊。",
      doctorHint: doctorHint || "上海新华医院建议先由普通门诊完成初步评估。",
      queueHint: queueHint || "预计候诊 15-30 分钟。",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

