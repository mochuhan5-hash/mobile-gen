import { getServerLang, tr } from "../lib/i18n";
import HomeEntryActions from "../components/HomeEntryActions";

export default async function HomePage() {
  const lang = await getServerLang();
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-[980px] items-center p-4 md:p-6">
        <div className="w-full rounded-3xl border border-white/20 bg-white/5 p-6 md:p-10">
          <p className="text-sm text-white/70">{tr(lang, "医院一体机", "Hospital Kiosk")}</p>
          <h1 className="mt-2 text-[42px] font-black leading-tight">
            {tr(lang, "请插入医保卡或扫描医保码", "Please insert insurance card or scan insurance QR")}
          </h1>

          <HomeEntryActions lang={lang} />

          <p className="mt-8 text-[18px] text-white/80">
            {tr(
              lang,
              "若需语音帮助，请点击右下角悬浮语音按钮，说出症状后系统将自动推荐挂号。",
              "Need voice help? Tap the floating mic at bottom-right and describe symptoms."
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

