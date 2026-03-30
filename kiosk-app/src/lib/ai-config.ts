/**
 * 获取 DashScope API Key。
 * 优先使用 DASHSCOPE_API_KEY，同时兼容历史变量名 QWEN_API_KEY。
 */
export function getDashscopeApiKey(): string | null {
  const apiKey = process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;
  const normalized = String(apiKey ?? "").trim();
  return normalized || null;
}
