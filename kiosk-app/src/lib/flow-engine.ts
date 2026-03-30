import type { TaskSlug } from "./task-pages";

export type FlowEvidence = {
  hasPendingCheckIn: boolean;
  unpaidOrderCount: number;
  reportReadyCount: number;
  queueStatus: "未排队" | "排队中" | "已过号";
  needsHumanAssist: boolean;
};

const DEFAULT_FLOW_EVIDENCE: FlowEvidence = {
  hasPendingCheckIn: true,
  unpaidOrderCount: 1,
  reportReadyCount: 1,
  queueStatus: "未排队",
  needsHumanAssist: false,
};

/**
 * 解析 URL 查询参数中的流程证据（无值时回落到默认值）。
 */
export function parseFlowEvidence(input?: Record<string, string | string[] | undefined>): FlowEvidence {
  const q = input ?? {};
  const get = (key: string) => {
    const val = q[key];
    if (Array.isArray(val)) return val[0] ?? "";
    return val ?? "";
  };
  const toInt = (key: string, fallback: number) => {
    const n = Number(get(key));
    return Number.isFinite(n) ? n : fallback;
  };

  const queueRaw = get("queueStatus");
  const queueStatus: FlowEvidence["queueStatus"] =
    queueRaw === "排队中" || queueRaw === "已过号" ? queueRaw : "未排队";

  return {
    hasPendingCheckIn: get("hasPendingCheckIn") ? get("hasPendingCheckIn") === "1" : DEFAULT_FLOW_EVIDENCE.hasPendingCheckIn,
    unpaidOrderCount: toInt("unpaidOrderCount", DEFAULT_FLOW_EVIDENCE.unpaidOrderCount),
    reportReadyCount: toInt("reportReadyCount", DEFAULT_FLOW_EVIDENCE.reportReadyCount),
    queueStatus,
    needsHumanAssist: get("needsHumanAssist") === "1",
  };
}

/**
 * 更新每个任务完成后的证据状态，用于下一跳决策。
 */
export function reduceEvidenceAfterTask(current: FlowEvidence, currentTask: TaskSlug): FlowEvidence {
  if (currentTask === "check-in") {
    return { ...current, hasPendingCheckIn: false, queueStatus: "排队中" };
  }
  if (currentTask === "queue-waiting") {
    return { ...current, queueStatus: "未排队" };
  }
  if (currentTask === "payment") {
    return { ...current, unpaidOrderCount: 0 };
  }
  if (currentTask === "print-report") {
    return { ...current, reportReadyCount: 0 };
  }
  return current;
}

/**
 * 根据证据计算下一任务（全自动跳转核心规则）。
 */
export function getNextTaskByEvidence(e: FlowEvidence): TaskSlug | null {
  if (e.needsHumanAssist) return "human-assist";
  if (e.queueStatus === "已过号") return "human-assist";
  if (e.hasPendingCheckIn) return "check-in";
  if (e.queueStatus === "排队中") return "queue-waiting";
  if (e.unpaidOrderCount > 0) return "payment";
  if (e.reportReadyCount > 0) return "print-report";
  return null;
}

/**
 * 将证据编码回 URL 查询串，便于页面间无状态传递。
 */
export function evidenceToQuery(e: FlowEvidence): string {
  const params = new URLSearchParams();
  params.set("hasPendingCheckIn", e.hasPendingCheckIn ? "1" : "0");
  params.set("unpaidOrderCount", String(e.unpaidOrderCount));
  params.set("reportReadyCount", String(e.reportReadyCount));
  params.set("queueStatus", e.queueStatus);
  params.set("needsHumanAssist", e.needsHumanAssist ? "1" : "0");
  return params.toString();
}

