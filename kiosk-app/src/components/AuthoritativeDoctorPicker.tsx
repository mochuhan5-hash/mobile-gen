"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLang, tr } from "../lib/i18n-shared";

type PickerDoctor = {
  name: string;
  title: string;
  specialty: string;
  nextSlot: string;
  consultationFee: number;
};

type AuthoritativeDoctorPickerProps = {
  doctors: PickerDoctor[];
  lang: AppLang;
  detailBaseHref: string;
};

/**
 * 权威医生三选一选择器：
 * - 点击卡片仅切换选中状态（高亮边框）
 * - 页面仅保留一组“返回首页 / 确认挂号”按钮
 * - 点击确认后，跳转到所选医生的详情挂号页
 */
export default function AuthoritativeDoctorPicker(props: AuthoritativeDoctorPickerProps) {
  const router = useRouter();
  const [selectedName, setSelectedName] = useState(props.doctors[0]?.name ?? "");

  const selectedDoctor = useMemo(
    () => props.doctors.find((d) => d.name === selectedName) ?? props.doctors[0],
    [props.doctors, selectedName]
  );

  const confirm = () => {
    if (!selectedDoctor) return;
    router.push(`${props.detailBaseHref}&selectedDoctor=${encodeURIComponent(selectedDoctor.name)}`);
  };

  return (
    <div className="mt-3 space-y-3">
      {props.doctors.map((doctor, idx) => {
        const active = doctor.name === selectedName;
        return (
          <button
            key={`${doctor.name}-${idx}`}
            type="button"
            onClick={() => setSelectedName(doctor.name)}
            className={[
              "w-full rounded-lg px-3 py-3 text-left transition",
              active
                ? "border-2 border-blue-400 bg-blue-500/10"
                : "border border-white/10 bg-white/5 hover:border-white/25",
            ].join(" ")}
          >
            <p className="text-[20px] font-bold text-white">
              {doctor.name} {doctor.title}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-xs text-white/60">{tr(props.lang, "擅长方向", "Specialty")}</p>
                <p className="text-[15px] font-semibold text-white">{doctor.specialty}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-xs text-white/60">{tr(props.lang, "最早号源", "Earliest Slot")}</p>
                <p className="text-[15px] font-semibold text-white">{doctor.nextSlot}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-xs text-white/60">{tr(props.lang, "挂号费", "Registration Fee")}</p>
                <p className="text-[15px] font-semibold text-white">¥{doctor.consultationFee}</p>
              </div>
            </div>
          </button>
        );
      })}

      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/25 bg-white px-5 py-2.5 text-center text-[15px] font-semibold text-black"
        >
          {tr(props.lang, "返回首页", "Home")}
        </button>
        <button
          type="button"
          onClick={confirm}
          className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-center text-[20px] font-bold text-white"
        >
          {tr(props.lang, "确认挂号", "Confirm Registration")}
        </button>
      </div>
    </div>
  );
}

