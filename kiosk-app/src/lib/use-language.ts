"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLang, LANG_COOKIE_KEY } from "./i18n-shared";

const STORAGE_KEY = "app_lang";

/**
 * 全局语言状态（客户端），默认中文。
 */
export function useLanguage() {
  const router = useRouter();
  const [lang, setLangState] = useState<AppLang>("zh");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") {
      setLangState(saved);
      document.documentElement.lang = saved === "zh" ? "zh-CN" : "en";
      document.cookie = `${LANG_COOKIE_KEY}=${saved}; path=/; max-age=31536000; samesite=lax`;
      return;
    }
    document.documentElement.lang = "zh-CN";
    document.cookie = `${LANG_COOKIE_KEY}=zh; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const setLang = (next: AppLang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.cookie = `${LANG_COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    router.refresh();
  };

  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);

  return { lang, setLang, t };
}

