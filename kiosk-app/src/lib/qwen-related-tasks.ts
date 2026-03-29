import { FlowEvidence } from "./flow-engine";
import { TaskSlug, TASK_PAGE_CONFIGS } from "./task-pages";

type RelatedTasksResponse = {
  relatedTaskSlugs: string[];
};

/**
 * 获取合法任务 slug 列表。
 */
function getAllTaskSlugs(): TaskSlug[] {
  return TASK_PAGE_CONFIGS.map((item) => item.slug);
}

/**
 * 解析模型返回的 JSON。
 */
function parseRelatedTasksJson(raw: string): string[] | null {
  const text = raw.trim();
  try {
    const parsed = JSON.parse(text) as Partial<RelatedTasksResponse>;
    if (!Array.isArray(parsed.relatedTaskSlugs)) return null;
    return parsed.relatedTaskSlugs.map((x) => String(x).trim()).filter(Boolean);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]) as Partial<RelatedTasksResponse>;
      if (!Array.isArray(parsed.relatedTaskSlugs)) return null;
      return parsed.relatedTaskSlugs.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      return null;
    }
  }
}

/**
 * 由 AI 根据当前阶段和流程状态推荐相关任务。
 * 失败时返回 null，由上层回退静态推荐。
 */
export async function getAiRelatedTaskSlugs(input: {
  currentTask: TaskSlug;
  symptom: string;
  evidence: FlowEvidence;
}): Promise<TaskSlug[] | null> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return null;

  const allSlugs = getAllTaskSlugs();
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
              "你是医院一体机流程推荐助手。请仅返回JSON：{relatedTaskSlugs:string[]}。" +
              "只允许从给定任务slug中选择，最多返回3个，不要包含当前任务。" +
              "默认医院场景固定为上海新华医院，基于院内已知流程进行推荐。",
          },
          {
            role: "user",
            content: JSON.stringify({
              currentTask: input.currentTask,
              symptom: input.symptom || "未提供",
              evidence: input.evidence,
              allowedTaskSlugs: allSlugs,
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
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseRelatedTasksJson(content);
    if (!parsed) return null;

    const filtered = parsed.filter((slug): slug is TaskSlug => {
      return allSlugs.includes(slug as TaskSlug) && slug !== input.currentTask;
    });
    return filtered.slice(0, 3);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

