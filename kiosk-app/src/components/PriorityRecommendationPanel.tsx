"use client";

import Link from "next/link";
import { AppLang, tr } from "../lib/i18n-shared";

type PriorityRecommendationPanelProps = {
  symptom: string;
  department: string;
  reason: string;
  doctorName: string;
  doctorTitle: string;
  doctorSpecialty: string;
  doctorNextSlot: string;
  doctorsPageHref: string;
  lang: AppLang;
};

/**
 * 症状识别后，直接输出推荐科室与医生。
 */
export default function PriorityRecommendationPanel(props: PriorityRecommendationPanelProps) {
  const tt = (zh: string, en: string) => tr(props.lang, zh, en);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/20 bg-black/40 p-4">
        <p className="mt-1 text-[20px] text-white/90">{tt("已识别症状：", "Recognized Symptom: ")}{props.symptom || tt("未提供", "N/A")}</p>
        <p className="mt-2 text-[24px] font-bold text-white">{tt("推荐科室：", "Recommended Department: ")}{props.department}</p>
        <p className="mt-2 text-[18px] text-white/85">{props.reason}</p>
      </div>

      <div className="rounded-xl border border-white/20 bg-black/40 p-4">
        <p className="text-sm text-white/70">{tt("推荐医生", "Recommended Doctor")}</p>
        <p className="mt-1 text-[24px] font-bold text-white">
          {props.doctorName} {props.doctorTitle}
        </p>
        <p className="mt-2 text-[17px] text-white/90">{tt("擅长：", "Specialty: ")}{props.doctorSpecialty}</p>
        <p className="mt-1 text-[17px] text-white/90">{tt("最早号源：", "Earliest Slot: ")}{props.doctorNextSlot}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/" className="rounded-xl border border-white/30 bg-white px-3 py-2.5 text-center text-[15px] font-semibold text-black">
          {tt("返回首页", "Home")}
        </Link>
        <Link href={props.doctorsPageHref} className="rounded-xl border border-white bg-blue-600 px-4 py-4 text-center text-[20px] font-bold text-white">
          {tt("确认挂号", "Confirm Registration")}
        </Link>
      </div>
    </div>
  );
}

