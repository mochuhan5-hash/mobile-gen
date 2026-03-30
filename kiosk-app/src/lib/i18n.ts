import { cookies } from "next/headers";
import { AppLang, LANG_COOKIE_KEY, tr } from "./i18n-shared";

/**
 * 服务端读取当前语言，默认中文。
 */
export async function getServerLang(): Promise<AppLang> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LANG_COOKIE_KEY)?.value;
  return raw === "en" ? "en" : "zh";
}

export { LANG_COOKIE_KEY, tr };

