export type JourneyStage = 1 | 2 | 3 | 4 | 5;

export type JourneyProgressState = {
  nextStage: JourneyStage;
  symptom: string;
  department: string;
  selectedDoctor: string;
  patientName: string;
  patientAge: number;
  patientGender: "男" | "女";
};

export const JOURNEY_PROGRESS_KEY = "xinhua-journey-progress-v1";

/**
 * 兜底的流程进度状态。
 */
export function getDefaultJourneyProgress(): JourneyProgressState {
  return {
    nextStage: 1,
    symptom: "",
    department: "",
    selectedDoctor: "",
    patientName: "",
    patientAge: 46,
    patientGender: "男",
  };
}

/**
 * 读取本地流程进度（仅客户端可用）。
 */
export function readJourneyProgress(): JourneyProgressState {
  if (typeof window === "undefined") return getDefaultJourneyProgress();
  try {
    const raw = window.localStorage.getItem(JOURNEY_PROGRESS_KEY);
    if (!raw) return getDefaultJourneyProgress();
    const parsed = JSON.parse(raw) as Partial<JourneyProgressState>;
    const nextStage = Number(parsed.nextStage);
    const validStage: JourneyStage = nextStage >= 1 && nextStage <= 5 ? (nextStage as JourneyStage) : 1;
    return {
      nextStage: validStage,
      symptom: String(parsed.symptom ?? ""),
      department: String(parsed.department ?? ""),
      selectedDoctor: String(parsed.selectedDoctor ?? ""),
      patientName: String(parsed.patientName ?? ""),
      patientAge: Number(parsed.patientAge ?? 46) || 46,
      patientGender: parsed.patientGender === "女" ? "女" : "男",
    };
  } catch {
    return getDefaultJourneyProgress();
  }
}

/**
 * 写入本地流程进度（仅客户端可用）。
 */
export function writeJourneyProgress(state: JourneyProgressState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOURNEY_PROGRESS_KEY, JSON.stringify(state));
}

/**
 * 按阶段生成入口 URL。
 */
export function buildStageHref(stage: JourneyStage, state: JourneyProgressState): string {
  const symptom = state.symptom || "";
  const department = state.department || "";
  const selectedDoctor = state.selectedDoctor || "";
  const patientName = state.patientName || "";
  const patientAge = String(state.patientAge || 46);
  const patientGender = state.patientGender || "男";

  if (stage === 1) {
    const q = new URLSearchParams({
      symptom,
      flowStage: "1",
      patientName,
      patientAge,
      patientGender,
    });
    return `/register/recommend?${q.toString()}`;
  }
  if (stage === 2) {
    const q = new URLSearchParams({
      symptom,
      department,
      hasPendingCheckIn: "1",
      unpaidOrderCount: "0",
      reportReadyCount: "0",
      queueStatus: "未排队",
      needsHumanAssist: "0",
      flowStage: "2",
      patientName,
      patientAge,
      patientGender,
    });
    return `/tasks/check-in?${q.toString()}`;
  }
  if (stage === 3) {
    const q = new URLSearchParams({
      symptom,
      department,
      hasPendingCheckIn: "0",
      unpaidOrderCount: "1",
      reportReadyCount: "0",
      queueStatus: "排队中",
      needsHumanAssist: "0",
      flowStage: "3",
      step: "2",
      patientName,
      patientAge,
      patientGender,
    });
    return `/tasks/queue-waiting?${q.toString()}`;
  }
  if (stage === 4) {
    const q = new URLSearchParams({
      symptom,
      department,
      hasPendingCheckIn: "0",
      unpaidOrderCount: "0",
      reportReadyCount: "1",
      queueStatus: "未排队",
      needsHumanAssist: "0",
      flowStage: "4",
      patientName,
      patientAge,
      patientGender,
    });
    return `/tasks/print-report?${q.toString()}`;
  }

  const q = new URLSearchParams({
    symptom,
    department,
    selectedDoctor,
    hasPendingCheckIn: "0",
    unpaidOrderCount: "1",
    reportReadyCount: "0",
    queueStatus: "未排队",
    needsHumanAssist: "0",
    flowStage: "5",
    patientName,
    patientAge,
    patientGender,
  });
  return `/tasks/confirm-medicines?${q.toString()}`;
}

