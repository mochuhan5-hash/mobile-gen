import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TaskFlowPanel from "../../../components/TaskFlowPanel";
import TaskNavigator from "../../../components/TaskNavigator";
import { parseFlowEvidence } from "../../../lib/flow-engine";
import { getServerLang } from "../../../lib/i18n";
import { buildMockJourneyData, Recommendation } from "../../../lib/mock-hospital-data";
import { getQwenClinicalPlan } from "../../../lib/qwen-clinical-plan";
import { getAiRelatedTaskSlugs } from "../../../lib/qwen-related-tasks";
import { getTaskConfigBySlug, TASK_PAGE_CONFIGS } from "../../../lib/task-pages";

type TaskPageProps = {
  params: Promise<{ task: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * 预生成任务路由，保证每个任务都有独立页面。
 */
export function generateStaticParams() {
  return TASK_PAGE_CONFIGS.map((item) => ({ task: item.slug }));
}

/**
 * 任务页面标题。
 */
export async function generateMetadata(props: TaskPageProps): Promise<Metadata> {
  const { task } = await props.params;
  const cfg = getTaskConfigBySlug(task);
  if (!cfg) return { title: "任务不存在" };
  return {
    title: `${cfg.title} | 医院一体机`,
    description: cfg.shortDescription,
  };
}

/**
 * 一任务一页面详情页。
 */
export default async function TaskDetailPage(props: TaskPageProps) {
  const lang = await getServerLang();
  const { task } = await props.params;
  const searchParams = await props.searchParams;
  const cfg = getTaskConfigBySlug(task);
  if (!cfg) {
    notFound();
  }
  const evidence = parseFlowEvidence(searchParams);
  const symptom = Array.isArray(searchParams.symptom) ? searchParams.symptom[0] ?? "" : searchParams.symptom ?? "";
  const paymentModeRaw = Array.isArray(searchParams.paymentMode)
    ? searchParams.paymentMode[0] ?? ""
    : searchParams.paymentMode ?? "";
  const paymentMode = paymentModeRaw === "registration-only" ? "registration-only" : "full";
  const selectedDoctor = Array.isArray(searchParams.selectedDoctor)
    ? searchParams.selectedDoctor[0] ?? ""
    : searchParams.selectedDoctor ?? "";
  const patientNameRaw = Array.isArray(searchParams.patientName)
    ? searchParams.patientName[0] ?? ""
    : searchParams.patientName ?? "";
  const patientAgeRawParam = Array.isArray(searchParams.patientAge)
    ? searchParams.patientAge[0] ?? ""
    : searchParams.patientAge ?? "";
  const patientAgeParsed = Number(patientAgeRawParam || "46");
  const patientAge = Number.isFinite(patientAgeParsed) ? Math.max(1, patientAgeParsed) : 46;
  const patientGenderRaw = Array.isArray(searchParams.patientGender)
    ? searchParams.patientGender[0] ?? ""
    : searchParams.patientGender ?? "";
  const patientGender = patientGenderRaw === "女" ? "女" : "男";
  const stepRaw = Array.isArray(searchParams.step) ? searchParams.step[0] ?? "" : searchParams.step ?? "";
  const initialStepIndexRaw = Number(stepRaw);
  const initialStepIndex = Number.isFinite(initialStepIndexRaw) ? Math.max(0, initialStepIndexRaw) : 0;
  const flowStageRaw = Array.isArray(searchParams.flowStage) ? searchParams.flowStage[0] ?? "" : searchParams.flowStage ?? "";
  const flowStageNum = Number(flowStageRaw);
  const flowStage = Number.isFinite(flowStageNum) ? flowStageNum : 0;
  const departmentRaw = Array.isArray(searchParams.department)
    ? searchParams.department[0] ?? ""
    : searchParams.department ?? "";
  const forcedRecommendation: Recommendation | undefined = departmentRaw
    ? {
        department: departmentRaw,
        reason: "按已识别结果继续流程",
        doctorHint: "",
        queueHint: "",
      }
    : undefined;
  const aiClinicalPlan = await getQwenClinicalPlan(symptom);
  const journey = buildMockJourneyData(symptom, evidence, {
    paymentMode,
    selectedDoctorName: selectedDoctor || undefined,
    forcedRecommendation,
    aiRecommendation: aiClinicalPlan?.recommendation,
    aiDoctors: aiClinicalPlan?.doctors,
    aiExamItems: aiClinicalPlan?.exams,
    aiMedicineItems: aiClinicalPlan?.medicines,
    patientProfile: {
      name: patientNameRaw || undefined,
      age: patientAge,
      gender: patientGender,
    },
    lang,
  });
  const aiRelated = await getAiRelatedTaskSlugs({
    currentTask: cfg.slug,
    symptom: symptom || journey.symptomInput,
    evidence,
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1200px] p-4 md:p-6">
        <TaskFlowPanel
          config={cfg}
          evidence={evidence}
          journey={journey}
          lang={lang}
          initialStepIndex={initialStepIndex}
          flowStage={flowStage}
        />

        <div className="mt-6">
          <TaskNavigator currentSlug={cfg.slug} relatedSlugs={aiRelated ?? cfg.related} lang={lang} />
        </div>
      </div>
    </main>
  );
}

