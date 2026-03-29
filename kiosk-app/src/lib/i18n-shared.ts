export type AppLang = "zh" | "en";

export const LANG_COOKIE_KEY = "app_lang";

/**
 * 双语文本选择器。
 */
export function tr(lang: AppLang, zh: string, en: string): string {
  return lang === "en" ? en : zh;
}

