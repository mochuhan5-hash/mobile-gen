"use client";

import { CreditCard, QrCode } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLang, tr } from "../lib/i18n-shared";
import {
  buildStageHref,
  getDefaultJourneyProgress,
  JourneyStage,
  readJourneyProgress,
  writeJourneyProgress,
} from "../lib/journey-progress";

type HomeEntryActionsProps = {
  lang: AppLang;
};

/**
 * 首页入口操作区：
 * - 插入医保卡：从第 1 阶段重新开始
 * - 扫描医保码：按本地记录自动进入下一阶段
 */
export default function HomeEntryActions(props: HomeEntryActionsProps) {
  const router = useRouter();
  const tt = (zh: string, en: string) => tr(props.lang, zh, en);

  /**
   * 将一体机阶段状态同步到手机端应用。
   */
  const syncStageToMobile = async (params: {
    completedStage: JourneyStage;
    nextStage: JourneyStage;
    symptom: string;
    department: string;
    selectedDoctor: string;
    syncToken?: string;
  }) => {
    if (typeof window === "undefined") return;
    const mobileBase = process.env.NEXT_PUBLIC_MOBILE_APP_URL?.trim();
    if (!mobileBase) return;
    const dedupeKey = `mobile-sync-${params.completedStage}-${params.nextStage}-${params.symptom}-${params.department}-${params.selectedDoctor}-${params.syncToken ?? ""}`;
    if (window.sessionStorage.getItem(dedupeKey) === "1") return;
    try {
      await fetch(`${mobileBase.replace(/\/$/, "")}/api/kiosk-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusCode: params.completedStage,
          nextStage: params.nextStage,
          symptom: params.symptom,
          department: params.department,
          selectedDoctor: params.selectedDoctor,
          source: "kiosk",
          ts: params.syncToken ? Number(params.syncToken) : Date.now(),
        }),
      });
      window.sessionStorage.setItem(dedupeKey, "1");
    } catch {
      // 手机端未启动或跨域失败时忽略，不影响一体机主流程。
    }
  };

  /**
   * 首次插卡时，从手机端读取用户档案并提取症状提示。
   */
  const fetchProfileFromMobile = async (): Promise<{
    symptom: string;
    patientName: string;
    patientAge: number;
    patientGender: "男" | "女";
  } | null> => {
    const mobileBase = process.env.NEXT_PUBLIC_MOBILE_APP_URL?.trim();
    if (!mobileBase) return null;
    try {
      const resp = await fetch(`${mobileBase.replace(/\/$/, "")}/api/user-profile`, {
        method: "GET",
      });
      const payload = (await resp.json()) as {
        ok?: boolean;
        data?: {
          symptomHint?: string;
          basicInfo?: { name?: string; age?: number; gender?: string };
          healthProfile?: { notes?: string };
          visitRecords?: Array<{ complaint?: string }>;
        } | null;
      };
      const data = payload.data;
      if (!data) return null;
      const symptom =
        String(data.symptomHint ?? "").trim() ||
        String(data.visitRecords?.[0]?.complaint ?? "").trim() ||
        String(data.healthProfile?.notes ?? "").trim();
      const name = String(data.basicInfo?.name ?? "").trim();
      const ageRaw = Number(data.basicInfo?.age ?? 46);
      const age = Number.isFinite(ageRaw) ? Math.max(1, ageRaw) : 46;
      const g = String(data.basicInfo?.gender ?? "");
      const patientGender: "男" | "女" = g.includes("女") || g.toLowerCase().includes("female") ? "女" : "男";
      return {
        symptom,
        patientName: name ? `${name[0]}*` : "",
        patientAge: age,
        patientGender,
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const syncToken = sp.get("syncTs") ?? "";
    const completedStageRaw = Number(sp.get("completedStage") ?? "");
    const completedStage: JourneyStage | null =
      completedStageRaw >= 1 && completedStageRaw <= 5 ? (completedStageRaw as JourneyStage) : null;
    const flowNextStageRaw = Number(sp.get("flowNextStage") ?? "");
    const flowNextStage: JourneyStage | null =
      flowNextStageRaw >= 1 && flowNextStageRaw <= 5 ? (flowNextStageRaw as JourneyStage) : null;
    if (!flowNextStage) return;

    const current = readJourneyProgress();
    const symptom = sp.get("symptom") ?? current.symptom;
    const department = sp.get("department") ?? current.department;
    const selectedDoctor = sp.get("selectedDoctor") ?? current.selectedDoctor;
    const patientName = sp.get("patientName") ?? current.patientName;
    const patientAgeRaw = Number(sp.get("patientAge") ?? current.patientAge);
    const patientAge = Number.isFinite(patientAgeRaw) ? patientAgeRaw : current.patientAge;
    const patientGender = sp.get("patientGender") === "女" ? "女" : current.patientGender;
    writeJourneyProgress({
      nextStage: flowNextStage,
      symptom,
      department,
      selectedDoctor,
      patientName,
      patientAge,
      patientGender,
    });
    if (completedStage) {
      void syncStageToMobile({
        completedStage,
        nextStage: flowNextStage,
        symptom,
        department,
        selectedDoctor,
        syncToken,
      });
    }
  }, []);

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={async () => {
          const base = getDefaultJourneyProgress();
          const mobileProfile = await fetchProfileFromMobile();
          const nextState = {
            ...base,
            symptom: mobileProfile?.symptom ?? base.symptom,
            patientName: mobileProfile?.patientName ?? base.patientName,
            patientAge: mobileProfile?.patientAge ?? base.patientAge,
            patientGender: mobileProfile?.patientGender ?? base.patientGender,
          };
          writeJourneyProgress(nextState);
          router.push(buildStageHref(1, nextState));
        }}
        className="block rounded-2xl border border-white/20 bg-black/40 p-6 text-left hover:bg-black/30"
      >
        <div className="mb-3 inline-flex rounded-xl bg-white/10 p-3">
          <CreditCard size={34} />
        </div>
        <p className="text-[24px] font-bold">{tt("插入医保卡", "Insert Card")}</p>
        <p className="mt-2 text-[18px] text-white/70">{tt("将卡片平稳插入读卡区", "Insert card into reader")}</p>
      </button>

      <button
        type="button"
        onClick={() => {
          const current = readJourneyProgress();
          const nextStage = current.nextStage;
          router.push(buildStageHref(nextStage, current));
        }}
        className="block rounded-2xl border border-white/20 bg-black/40 p-6 text-left hover:bg-black/30"
      >
        <div className="mb-3 inline-flex rounded-xl bg-white/10 p-3">
          <QrCode size={34} />
        </div>
        <p className="text-[24px] font-bold">{tt("扫描医保码", "Scan Insurance QR")}</p>
        <p className="mt-2 text-[18px] text-white/70">{tt("将二维码对准扫码区域", "Align QR with scanner")}</p>
      </button>
    </div>
  );
}

