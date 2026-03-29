import { evidenceToQuery, FlowEvidence, getNextTaskByEvidence } from "../../../lib/flow-engine";
import {
  buildMockJourneyData,
  Recommendation,
  sortDoctorCandidatesByPriority,
} from "../../../lib/mock-hospital-data";
import { getServerLang, tr } from "../../../lib/i18n";
import { getQwenClinicalPlan } from "../../../lib/qwen-clinical-plan";
import { getQwenTriageRecommendation } from "../../../lib/qwen-triage";
import PriorityRecommendationPanel from "../../../components/PriorityRecommendationPanel";

type RecommendRegisterPageProps = {
  searchParams: Promise<{
    symptom?: string;
    auto?: string;
    department?: string;
    reason?: string;
    doctorHint?: string;
    queueHint?: string;
    flowStage?: string;
    patientName?: string;
    patientAge?: string;
    patientGender?: string;
  }>;
};

export default async function RecommendRegisterPage(props: RecommendRegisterPageProps) {
  const lang = await getServerLang();
  const sp = await props.searchParams;
  const symptom = sp.symptom ?? "";
  const patientName = sp.patientName ?? "";
  const patientAgeRaw = Number(sp.patientAge ?? "46");
  const patientAge = Number.isFinite(patientAgeRaw) ? Math.max(1, patientAgeRaw) : 46;
  const patientGender = sp.patientGender === "女" ? "女" : "男";
  const flowStageRaw = Number(sp.flowStage ?? "1");
  const flowStage = Number.isFinite(flowStageRaw) ? flowStageRaw : 1;
  const evidence: FlowEvidence = {
    hasPendingCheckIn: true,
    unpaidOrderCount: 1,
    reportReadyCount: 1,
    queueStatus: "未排队",
    needsHumanAssist: false,
  };
  const fallbackJourney = buildMockJourneyData(symptom, evidence);
  const queryRecommendation: Recommendation | undefined = sp.department
    ? {
        department: sp.department,
        reason: sp.reason ?? "建议按推荐科室就诊。",
        doctorHint: sp.doctorHint ?? "",
        queueHint: sp.queueHint ?? "",
      }
    : undefined;
  const aiClinicalPlan = queryRecommendation ? null : await getQwenClinicalPlan(symptom);
  const aiRecommendation = queryRecommendation ? null : await getQwenTriageRecommendation(symptom);
  const recommendation: Recommendation =
    queryRecommendation ?? aiClinicalPlan?.recommendation ?? aiRecommendation ?? fallbackJourney.recommendation;
  const journey = buildMockJourneyData(symptom, evidence, {
    forcedRecommendation: recommendation,
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
  const directDoctor = sortDoctorCandidatesByPriority(journey.doctorCandidates, "time-first")[0];
  const nextTask = getNextTaskByEvidence(evidence);
  const nextHref = nextTask
    ? `/tasks/${nextTask}?symptom=${encodeURIComponent(symptom)}&${evidenceToQuery(evidence)}`
    : "/";
  const doctorsPageHref =
    `/register/doctors?symptom=${encodeURIComponent(symptom)}` +
    `&priority=time-first` +
    `&flowStage=${encodeURIComponent(String(flowStage))}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&department=${encodeURIComponent(recommendation.department)}` +
    `&reason=${encodeURIComponent(recommendation.reason)}` +
    `&doctorHint=${encodeURIComponent(recommendation.doctorHint)}` +
    `&queueHint=${encodeURIComponent(recommendation.queueHint)}` +
    `&next=${encodeURIComponent(nextHref)}`;
  const symptomDisplay =
    lang === "en" && /[\u4e00-\u9fff]/.test(symptom)
      ? "Symptom provided via voice input"
      : symptom || tr(lang, "未提供", "N/A");

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[980px] p-4 md:p-6">
        <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
          <p className="text-sm text-white/70">{tr(lang, "推荐预约挂号页面", "Registration Recommendation")}</p>
          <h1 className="mt-2 text-[36px] font-black">{tr(lang, "系统已识别您的需求", "Your request has been recognized")}</h1>
          <p className="mt-3 text-[20px] text-white/90">{tr(lang, "输入症状：", "Input symptom: ")}{symptomDisplay}</p>
          <p className="mt-1 text-[18px] text-white/80">
            {tr(lang, "就诊人：", "Patient: ")}{journey.patient.maskedName}（{journey.patient.gender}，{journey.patient.age}{tr(lang, "岁", "")}） | {tr(lang,"就诊号：","Visit No: ")}
            {journey.patient.visitNo}
          </p>

          <div className="mt-5">
            <PriorityRecommendationPanel
              symptom={symptomDisplay}
              department={journey.recommendation.department}
              reason={journey.recommendation.reason}
              doctorName={directDoctor.name}
              doctorTitle={directDoctor.title}
              doctorSpecialty={directDoctor.specialty}
              doctorNextSlot={directDoctor.nextSlot}
              doctorsPageHref={doctorsPageHref}
              lang={lang}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

