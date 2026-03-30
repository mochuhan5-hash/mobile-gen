import Link from "next/link";
import AuthoritativeDoctorPicker from "../../../components/AuthoritativeDoctorPicker";
import { parseFlowEvidence } from "../../../lib/flow-engine";
import {
  PriorityMode,
  Recommendation,
  buildMockJourneyData,
  isAbnormalItem,
  sortDoctorCandidatesByPriority,
} from "../../../lib/mock-hospital-data";
import { getServerLang, tr } from "../../../lib/i18n";
import { getQwenClinicalPlan } from "../../../lib/qwen-clinical-plan";
import { getQwenTriageRecommendation } from "../../../lib/qwen-triage";

type DoctorsPageProps = {
  searchParams: Promise<{
    symptom?: string;
    priority?: string;
    department?: string;
    reason?: string;
    doctorHint?: string;
    queueHint?: string;
    followup?: string;
    originalDoctor?: string;
    next?: string;
    hasPendingCheckIn?: string;
    unpaidOrderCount?: string;
    reportReadyCount?: string;
    queueStatus?: string;
    needsHumanAssist?: string;
    expertList?: string;
    fastList?: string;
    selectedDoctor?: string;
    adjustCount?: string;
    adjustPref?: string;
    flowStage?: string;
    patientName?: string;
    patientAge?: string;
    patientGender?: string;
  }>;
};

/**
 * 推荐医生详情页（位于优先级选择之后）。
 */
export default async function DoctorsPage(props: DoctorsPageProps) {
  const lang = await getServerLang();
  const sp = await props.searchParams;
  const symptom = sp.symptom ?? "";
  const syncTs = Date.now();
  const patientName = sp.patientName ?? "";
  const patientAgeRaw = Number(sp.patientAge ?? "46");
  const patientAge = Number.isFinite(patientAgeRaw) ? Math.max(1, patientAgeRaw) : 46;
  const patientGender = sp.patientGender === "女" ? "女" : "男";
  const flowStageRaw = Number(sp.flowStage ?? "0");
  const flowStage = Number.isFinite(flowStageRaw) ? flowStageRaw : 0;
  const priority: PriorityMode = sp.priority === "expert-first" ? "expert-first" : "time-first";
  const isFollowupMode = sp.followup === "1";
  const adjustCountRaw = Number(sp.adjustCount ?? "0");
  const adjustCount = Number.isFinite(adjustCountRaw) ? Math.max(0, adjustCountRaw) : 0;
  const adjustPref: PriorityMode =
    sp.adjustPref === "expert-first" ? "expert-first" : "time-first";
  const activePriority: PriorityMode = !isFollowupMode && adjustCount > 0 ? adjustPref : priority;
  const singleAdjustMode = !isFollowupMode && adjustCount > 0 && adjustCount <= 2;
  const showExpertList =
    !isFollowupMode && (sp.expertList === "1" || (adjustCount > 2 && adjustPref === "expert-first"));
  const showFastList =
    !isFollowupMode && (sp.fastList === "1" || (adjustCount > 2 && adjustPref === "time-first"));
  const queryRecommendation: Recommendation | undefined = sp.department
    ? {
        department: sp.department,
        reason: sp.reason ?? "建议按推荐科室就诊。",
        doctorHint: sp.doctorHint ?? "",
        queueHint: sp.queueHint ?? "",
      }
    : undefined;
  // 若 URL 已带推荐科室，则优先使用，避免语言切换时重算导致内容漂移。
  const aiClinicalPlan = await getQwenClinicalPlan(symptom);
  const aiRecommendation = queryRecommendation ? null : await getQwenTriageRecommendation(symptom);
  const forcedRecommendation: Recommendation | undefined =
    queryRecommendation ?? aiClinicalPlan?.recommendation ?? aiRecommendation ?? undefined;
  const evidence = parseFlowEvidence(sp);
  const journey = buildMockJourneyData(symptom, evidence, {
    selectedDoctorName: sp.originalDoctor ?? undefined,
    forcedRecommendation,
    aiRecommendation: aiClinicalPlan?.recommendation,
    aiDoctors: aiClinicalPlan?.doctors,
    aiExamItems: aiClinicalPlan?.exams,
    aiMedicineItems: aiClinicalPlan?.medicines,
    patientProfile: {
      name: patientName || undefined,
      age: patientAge,
      gender: patientGender,
    },
    lang,
  });
  const doctors = sortDoctorCandidatesByPriority(journey.doctorCandidates, activePriority);
  const selectedDoctorByQuery = doctors.find((d) => d.name === (sp.selectedDoctor ?? ""));
  const adjustedIndex = singleAdjustMode ? Math.min(adjustCount, Math.max(0, doctors.length - 1)) : 0;
  const recommendedDoctor =
    !isFollowupMode && selectedDoctorByQuery ? selectedDoctorByQuery : doctors[adjustedIndex] ?? doctors[0];
  const originalDoctor =
    doctors.find((d) => d.name === (sp.originalDoctor ?? "")) ??
    doctors.find((d) => journey.appointment.doctor.includes(d.name)) ??
    doctors[0];

  const abnormalCount = journey.payments.items.filter(
    (item, idx) => isAbnormalItem(item.name, journey.symptomInput, idx)
  ).length;
  const severeAbnormal = abnormalCount >= 2;

  const originalDoctorNoPayHref =
    `/?completedStage=4&flowNextStage=5&syncTs=${encodeURIComponent(String(syncTs))}&symptom=${encodeURIComponent(symptom)}` +
    `&department=${encodeURIComponent(journey.recommendation.department)}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&selectedDoctor=${encodeURIComponent(originalDoctor.name)}`;

  const expertFollowupPayHref =
    `/?completedStage=4&flowNextStage=5&syncTs=${encodeURIComponent(String(syncTs))}&symptom=${encodeURIComponent(symptom)}` +
    `&department=${encodeURIComponent(journey.recommendation.department)}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&selectedDoctor=${encodeURIComponent(recommendedDoctor.name)}`;

  const paymentHref =
    `/tasks/payment?symptom=${encodeURIComponent(symptom)}` +
    `&department=${encodeURIComponent(journey.recommendation.department)}` +
    `&selectedDoctor=${encodeURIComponent(recommendedDoctor.name)}` +
    `&flowStage=${encodeURIComponent(String(flowStage))}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&paymentMode=registration-only` +
    `&hasPendingCheckIn=1&unpaidOrderCount=1&reportReadyCount=1&queueStatus=未排队&needsHumanAssist=0`;
  const topExpertDoctors = sortDoctorCandidatesByPriority(journey.doctorCandidates, "expert-first").slice(0, 3);
  const topFastDoctors = sortDoctorCandidatesByPriority(journey.doctorCandidates, "time-first").slice(0, 3);
  const detailBaseHref =
    `/register/doctors?symptom=${encodeURIComponent(symptom)}` +
    `&flowStage=${encodeURIComponent(String(flowStage))}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&priority=expert-first` +
    `&department=${encodeURIComponent(journey.recommendation.department)}` +
    `&reason=${encodeURIComponent(forcedRecommendation?.reason ?? journey.recommendation.reason)}` +
    `&doctorHint=${encodeURIComponent(forcedRecommendation?.doctorHint ?? journey.recommendation.doctorHint)}` +
    `&queueHint=${encodeURIComponent(forcedRecommendation?.queueHint ?? journey.recommendation.queueHint)}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-[980px] items-center p-4 md:p-6">
        <div className="w-full rounded-2xl border border-white/20 bg-white/5 p-6">
          {!isFollowupMode ? (
            <div className="mt-5">
              <div className="rounded-xl border border-white/15 bg-black/40 p-4">
                <p className="text-[22px] font-bold text-white">
                  {tr(lang, "推荐科室：", "Recommended Department: ")}
                  {journey.recommendation.department}
                </p>
                {showExpertList || showFastList ? (
                  <>
                    <p className="text-sm text-white/70">
                      {showExpertList
                        ? tr(lang, "已为你筛选本科室 3 位更权威医生，请选择并确认挂号", "Top 3 authoritative doctors are listed below")
                        : tr(lang, "已为你筛选本科室 3 位最早号源医生，请选择并确认挂号", "Top 3 earliest-slot doctors are listed below")}
                    </p>
                    <AuthoritativeDoctorPicker
                      doctors={showExpertList ? topExpertDoctors : topFastDoctors}
                      lang={lang}
                      detailBaseHref={detailBaseHref}
                    />
                  </>
                ) : (
                  <>
                    {singleAdjustMode ? (
                      <p className="text-sm text-white/70">
                        {tr(
                          lang,
                          `已按你的偏好重新推荐医生（第 ${adjustCount} 轮）`,
                          `Doctor recommendation updated by your preference (round ${adjustCount})`
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-white/70">
                        {tr(lang, "系统已根据优先级为你推荐 1 位医生", "Top doctor recommendation based on priority")}
                      </p>
                    )}
                    <p className="mt-1 text-[25px] font-bold">
                      {recommendedDoctor.name} {recommendedDoctor.title}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-xs text-white/60">{tr(lang, "擅长方向", "Specialty")}</p>
                        <p className="text-[16px] font-semibold text-white">{recommendedDoctor.specialty}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-xs text-white/60">{tr(lang, "最早号源", "Earliest Slot")}</p>
                        <p className="text-[16px] font-semibold text-white">{recommendedDoctor.nextSlot}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-xs text-white/60">{tr(lang, "预计候诊", "Estimated Wait")}</p>
                        <p className="text-[16px] font-semibold text-white">
                          {recommendedDoctor.waitMinutes} {tr(lang, "分钟", "min")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-xs text-white/60">{tr(lang, "诊室位置 / 挂号费", "Room / Fee")}</p>
                        <p className="text-[16px] font-semibold text-white">
                          {journey.appointment.room} / ¥{recommendedDoctor.consultationFee}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <Link
                        href="/"
                        className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/25 bg-white px-5 py-2.5 text-center text-[15px] font-semibold text-black"
                      >
                        {tr(lang, "返回首页", "Home")}
                      </Link>
                      <Link
                        href={paymentHref}
                        className="col-span-2 inline-flex w-full min-h-[56px] items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-center text-[20px] font-bold text-white"
                      >
                        {tr(lang, "确认挂号", "Confirm Registration")}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {!severeAbnormal ? (
                <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 p-4">
                  <p className="text-sm text-emerald-100">
                    {tr(lang, "当前异常较轻，推荐原医生复诊（免挂号费）", "Mild abnormalities. Follow-up with original doctor (no fee)")}
                  </p>
                  <p className="mt-1 text-[25px] font-bold text-white">
                    {originalDoctor.name} {originalDoctor.title}
                  </p>
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-xs text-white/60">{tr(lang, "擅长方向", "Specialty")}</p>
                    <p className="text-[16px] font-semibold text-white">{originalDoctor.specialty}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <Link
                      href="/"
                      className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/25 bg-white px-5 py-2.5 text-center text-[15px] font-semibold text-black"
                    >
                      {tr(lang, "返回首页", "Home")}
                    </Link>
                    <Link
                      href={originalDoctorNoPayHref}
                      className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-center text-[20px] font-bold text-white"
                    >
                      {tr(lang, "原医生复诊（免缴费）", "Original Doctor Follow-up (No Fee)")}
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-red-300/40 bg-red-500/10 p-4">
                    <p className="text-[22px] font-bold text-white">
                      {tr(lang, "推荐科室：", "Recommended Department: ")}
                      {journey.recommendation.department}
                    </p>
                    <p className="text-sm text-red-100">
                      {tr(lang, "异常项目较多且严重，优先建议专家号复诊", "Multiple severe abnormalities. Specialist follow-up recommended")}
                    </p>
                    <p className="mt-1 text-[25px] font-bold text-white">
                      {recommendedDoctor.name} {recommendedDoctor.title}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-xs text-white/60">{tr(lang, "擅长方向", "Specialty")}</p>
                        <p className="text-[16px] font-semibold text-white">{recommendedDoctor.specialty}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-xs text-white/60">{tr(lang, "诊室位置 / 挂号费", "Room / Fee")}</p>
                        <p className="text-[16px] font-semibold text-white">
                          {journey.appointment.room} / ¥{recommendedDoctor.consultationFee}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <Link
                        href="/"
                        className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/25 bg-white px-5 py-2.5 text-center text-[15px] font-semibold text-black"
                      >
                        {tr(lang, "返回首页", "Home")}
                      </Link>
                      <Link
                        href={expertFollowupPayHref}
                        className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-center text-[20px] font-bold text-white"
                      >
                        {tr(lang, "挂专家号复诊", "Book Specialist Follow-up")}
                      </Link>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-black/40 p-4">
                    <p className="text-sm text-white/70">{tr(lang, "保留原医生复诊选项（免挂号费）", "Original doctor option remains (no fee)")}</p>
                    <p className="mt-1 text-[22px] font-bold text-white">
                      {originalDoctor.name} {originalDoctor.title}
                    </p>
                    <div className="mt-3">
                      <Link
                        href={originalDoctorNoPayHref}
                        className="inline-flex min-h-[52px] min-w-[420px] items-center justify-center rounded-xl border border-white/25 bg-white px-6 py-3 text-center text-[18px] font-bold text-black"
                      >
                        {tr(lang, "原医生复诊（免缴费）", "Original Doctor Follow-up (No Fee)")}
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

