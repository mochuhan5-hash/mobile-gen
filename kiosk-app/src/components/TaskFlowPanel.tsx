"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ActionButtons,
  ExamGroupCard,
  LocationCard,
  PaymentSummaryCard,
  PharmacyCard,
  QueueStatusCard,
  ReportStatusCard,
  StateBlock,
  TaskStatusHeader,
  TimeCard,
} from "./atom";
import type { TaskPageConfig, TaskSlug } from "../lib/task-pages";
import {
  evidenceToQuery,
  FlowEvidence,
  getNextTaskByEvidence,
  reduceEvidenceAfterTask,
} from "../lib/flow-engine";
import { isAbnormalItem } from "../lib/mock-hospital-data";
import type { MockJourneyData } from "../lib/mock-hospital-data";
import { AppLang, tr } from "../lib/i18n-shared";
import { JourneyStage, readJourneyProgress, writeJourneyProgress } from "../lib/journey-progress";

type TaskFlowPanelProps = {
  config: TaskPageConfig;
  evidence: FlowEvidence;
  journey: MockJourneyData;
  lang: AppLang;
  initialStepIndex?: number;
  flowStage?: number;
};

/**
 * 根据任务与步骤索引渲染对应原子组件。
 */
function renderStepAtoms(slug: TaskSlug, stepIndex: number, journey: MockJourneyData, lang: AppLang) {
  const tt = (zh: string, en: string) => tr(lang, zh, en);
  if (slug === "check-in") {
    return (
      <div className="space-y-4">
        <TaskStatusHeader
          title={`${tt("待签到：", "Pending Check-in: ")}${journey.appointment.department}`}
          status="pending"
          description={`${tt("就诊人", "Patient")} ${journey.patient.maskedName}, ${tt("就诊号", "Visit No")} ${journey.patient.visitNo}`}
        />
        <LocationCard
          hospital={journey.hospital.name}
          department={journey.appointment.department}
          room={journey.appointment.room}
          address={`${journey.hospital.campus}, ${tt("请按导视前往对应楼层", "follow signs to target floor")}`}
          lang={lang}
        />
        <TimeCard date={journey.appointment.date} timeSlot={journey.appointment.timeSlot} lang={lang} />
      </div>
    );
  }

  if (slug === "payment") {
    if (stepIndex === 0) {
      return (
        <TaskStatusHeader
          title={tt("待缴费订单", "Pending Payment")}
          status="pending"
          description={`${tt("就诊号", "Visit No")} ${journey.patient.visitNo}, ${tt("共", "total")} ${journey.payments.items.length} ${tt("个收费项目", "items")}`}
        />
      );
    }
    if (stepIndex === 1) {
      return <PaymentSummaryCard items={journey.payments.items} total={journey.payments.total} status="unpaid" lang={lang} />;
    }
    if (stepIndex === 2) {
      return <TaskStatusHeader title={tt("支付确认中", "Confirming Payment")} status="processing" description={tt("支付渠道返回中，请稍候", "Waiting for payment channel response")} />;
    }
    return <TaskStatusHeader title={tt("支付完成", "Payment Completed")} status="completed" description={tt("请保留票据或前往下一任务", "Keep receipt or continue to next task")} />;
  }

  if (slug === "print-report") {
    const reportRows = journey.payments.items.map((item, idx) => {
      const abnormal = isAbnormalItem(item.name, journey.symptomInput, idx);
      return {
        name: item.name,
        abnormal,
      };
    });
    const abnormalRows = reportRows.filter((row) => row.abnormal);

    return (
      <div className="space-y-3">
        <TaskStatusHeader
          title={tt("检查结果已出", "Results Ready")}
          status={abnormalRows.length ? "failed" : "completed"}
          description={
            abnormalRows.length
              ? tt("仅展示异常项目，请优先查看异常并按建议复诊", "Only abnormal items shown. Please review and follow up.")
              : tt("当前未发现异常项目", "No abnormal items currently")
          }
        />
        <div className="space-y-2 rounded-xl border border-black/20 bg-white p-3">
          {(abnormalRows.length ? abnormalRows : []).map((row, idx) => (
            <div
              key={`${row.name}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-black/15 bg-white px-3 py-3"
            >
              <div>
                <p className="text-sm text-black/70">{tt("异常项目", "Abnormal Item")} {idx + 1}</p>
                <p className="text-[18px] font-semibold text-black">{row.name}</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-red-200 bg-red-500/15 px-4 py-2 text-[16px] font-semibold text-red-700"
              >
                {tt("查看异常", "View Abnormal")}
              </button>
            </div>
          ))}
          {!abnormalRows.length ? (
            <p className="text-sm text-black/70">{tt("暂无异常项目。", "No abnormal items.")}</p>
          ) : null}
        </div>
        <p className="text-xs text-white/70">
          {tt("报告编号：", "Report ID: ")}{journey.report.id} | {tt("出具时间：", "Issued At: ")}{journey.report.date}
        </p>
      </div>
    );
  }

  if (slug === "confirm-medicines") {
    return (
      <div className="space-y-3">
        <TaskStatusHeader
          title={tt("确认药品清单", "Confirm Medicine List")}
          status="pending"
          description={`${tt("本次复诊共", "Follow-up includes")} ${journey.medicinePlan.items.length} ${tt("项药品，请确认后进入缴费", "medicine items. Confirm then pay.")}`}
        />
        <div className="space-y-2 rounded-xl border border-black/20 bg-white p-3">
          {journey.medicinePlan.items.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-3">
              <div>
                <p className="text-[17px] font-semibold text-black">{idx + 1}. {item.name}</p>
                <p className="text-sm text-black/70">{item.spec} | {tt("数量", "Qty")} {item.qty}</p>
              </div>
              <p className="text-[17px] font-bold text-black">¥{(item.price * item.qty).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slug === "medicine-payment") {
    if (stepIndex === 0) {
      return <TaskStatusHeader title={tt("药品待缴费", "Medicine Pending Payment")} status="pending" description={tt("请核对药品费用后支付", "Review medicine fee before payment")} />;
    }
    if (stepIndex === 1) {
      return (
        <PaymentSummaryCard
          items={journey.medicinePlan.items.map((item) => ({ name: item.name, price: item.price * item.qty }))}
          total={journey.medicinePlan.total}
          status="unpaid"
          lang={lang}
        />
      );
    }
    return <TaskStatusHeader title={tt("药品支付完成", "Medicine Payment Completed")} status="completed" description={tt("可前往药房窗口取药", "Please pick up at pharmacy window")} />;
  }

  if (slug === "queue-waiting") {
    if (stepIndex === 0) {
      return <TaskStatusHeader title={tt("候诊中", "Waiting")} status="processing" description={tt("请留意屏幕叫号并在候诊区等待", "Watch queue number and wait in area")} />;
    }
    if (stepIndex === 1) {
      return (
        <QueueStatusCard
          currentNumber={journey.queue.currentNumber}
          waitingCount={journey.queue.waitingCount}
          estimatedTime={journey.queue.estimatedTime}
          lang={lang}
        />
      );
    }
    const examCount = journey.examPlan.items.length;
    return (
      <div className="space-y-3">
        <TaskStatusHeader
          title={tt("确认检查项目", "Confirm Exam Items")}
          status="pending"
          description={`${tt("已为您智能规划", "Smart plan prepared for")} ${examCount} ${tt("个检查项目顺序，请确认后缴费", "exam items. Confirm then pay.")}`}
        />
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{journey.examPlan.planningReason}</p>
        {examCount <= 2 ? (
          <ExamGroupCard
            title={tt("本次检查项目", "Exam Items")}
            exams={journey.examPlan.items.map((item) => ({
              name: `${item.order}. ${item.name}${lang === "en" ? ` (${item.location})` : `（${item.location}）`}`,
              status: "pending",
            }))}
            lang={lang}
          />
        ) : null}
        {examCount > 2 ? (
          <div className="space-y-3">
            {journey.examPlan.groups.map((group) => (
              <ExamGroupCard key={group.title} title={group.title} exams={group.exams} lang={lang} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (slug === "human-assist") {
    if (stepIndex === 0) {
      return <TaskStatusHeader title={tt("建议人工协助", "Human Assistance Suggested")} status="pending" description={tt("检测到多次取消和停留过久", "Multiple cancels/long idle detected")} />;
    }
    if (stepIndex === 1) {
      return <LocationCard hospital={journey.hospital.name} department={tt("导诊服务台", "Guidance Desk")} room={tt("门诊大厅 1 层", "Outpatient Hall 1F")} lang={lang} />;
    }
    if (stepIndex === 2) {
      return (
        <PharmacyCard
          window={journey.assist.window}
          code={journey.assist.code}
          medicines={journey.assist.checklist}
          lang={lang}
        />
      );
    }
    return <TaskStatusHeader title={tt("人工接续中", "Handing to Staff")} status="processing" description={tt("请按现场指引继续办理", "Please follow onsite guidance")} />;
  }

  return <StateBlock type="empty" message={tt("暂未配置该任务步骤视图", "Task step view not configured")} lang={lang} />;
}

/**
 * 任务流程面板：一任务内分步骤执行。
 */
export default function TaskFlowPanel(props: TaskFlowPanelProps) {
  const router = useRouter();
  const tt = (zh: string, en: string) => tr(props.lang, zh, en);
  const isCheckInFlow = props.config.slug === "check-in";
  const isQueueWaitingFlow = props.config.slug === "queue-waiting";
  const isReportFlow = props.config.slug === "print-report";
  const isConfirmMedicinesFlow = props.config.slug === "confirm-medicines";
  const isMedicinePaymentFlow = props.config.slug === "medicine-payment";
  const stepItems = isCheckInFlow
    ? [tt("确认签到信息", "Confirm Check-in Info")]
    : isQueueWaitingFlow
      ? [tt("候诊中", "Waiting"), tt("当前叫号", "Current Queue"), tt("确认检查项目", "Confirm Exams")]
      : isReportFlow
        ? [tt("检查结果已出", "Results Ready")]
        : isConfirmMedicinesFlow
          ? [tt("确认药品清单", "Confirm Medicine List")]
          : isMedicinePaymentFlow
            ? [tt("药品待缴费", "Medicine Pending Payment"), tt("核对费用", "Review Fee"), tt("支付完成", "Payment Done")]
      : props.config.steps;
  const total = stepItems.length;
  const [stepIndex, setStepIndex] = useState(props.initialStepIndex ?? 0);
  const [autoCountDown, setAutoCountDown] = useState(3);
  const isLast = stepIndex >= total - 1;
  const [done, setDone] = useState(false);
  const isPaymentFlow = props.config.slug === "payment";
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const flowStage = props.flowStage ?? 0;
  const patientName = props.journey.patient.maskedName;
  const patientAge = String(props.journey.patient.age);
  const patientGender = props.journey.patient.gender === "女" ? "女" : "男";
  const patientParams = `&patientName=${encodeURIComponent(patientName)}&patientAge=${encodeURIComponent(
    patientAge
  )}&patientGender=${encodeURIComponent(patientGender)}`;

  /**
   * 阶段完成后回首页，并记录扫码进入的下一阶段。
   */
  const goHomeWithNextStage = (completedStage: JourneyStage, nextStage: JourneyStage) => {
    const current = readJourneyProgress();
    const selectedDoctor = props.journey.appointment.doctor.split(" ")[0] ?? "";
    const symptom = props.journey.symptomInput || current.symptom;
    const department = props.journey.recommendation.department || current.department;
    writeJourneyProgress({
      nextStage,
      symptom,
      department,
      selectedDoctor: selectedDoctor || current.selectedDoctor,
      patientName: patientName || current.patientName,
      patientAge: Number(patientAge) || current.patientAge,
      patientGender: patientGender || current.patientGender,
    });
    const mobileBase = process.env.NEXT_PUBLIC_MOBILE_APP_URL?.trim();
    const syncTs = Date.now();
    if (mobileBase) {
      const endpoint = `${mobileBase.replace(/\/$/, "")}/api/kiosk-stage`;
      const payload = {
        statusCode: completedStage,
        nextStage,
        symptom,
        department,
        selectedDoctor: selectedDoctor || current.selectedDoctor,
        source: "kiosk",
        ts: syncTs,
      };
      try {
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
          navigator.sendBeacon(endpoint, blob);
        } else {
          void fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          });
        }
      } catch {
        // 立即推送失败时，首页还有 query 同步兜底。
      }
    }
    const query = new URLSearchParams({
      completedStage: String(completedStage),
      flowNextStage: String(nextStage),
      symptom,
      department,
      selectedDoctor: selectedDoctor || current.selectedDoctor,
      patientName: patientName || current.patientName,
      patientAge,
      patientGender,
      syncTs: String(syncTs),
    });
    router.push(`/?${query.toString()}`);
  };

  const stepTitle = useMemo(() => stepItems[stepIndex] ?? "步骤", [stepItems, stepIndex]);
  const nextEvidence = useMemo(
    () => reduceEvidenceAfterTask(props.evidence, props.config.slug),
    [props.evidence, props.config.slug]
  );
  const nextTask = useMemo(() => getNextTaskByEvidence(nextEvidence), [nextEvidence]);

  useEffect(() => {
    if (!done || autoCountDown <= 0) return;
    const timer = window.setTimeout(() => {
      setAutoCountDown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [done, autoCountDown]);

  useEffect(() => {
    if (!isPaymentFlow) return;
    // 缴费流程自动化：识别待缴费 -> 2秒后到明细；支付确认 -> 2秒后支付完成。
    if (stepIndex !== 0 && stepIndex !== 2) return;
    const timer = window.setTimeout(() => {
      setStepIndex((prev) => {
        if (prev === 0) return 1;
        if (prev === 2) return 3;
        return prev;
      });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [isPaymentFlow, stepIndex]);

  useEffect(() => {
    if (!isQueueWaitingFlow) return;
    if (stepIndex !== 0) return;
    const timer = window.setTimeout(() => {
      setStepIndex(1);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [isQueueWaitingFlow, stepIndex]);

  useEffect(() => {
    if (!isPaymentFlow || !isPrintingReceipt) return;
    const timer = window.setTimeout(() => {
      const commonEvidence = {
        ...nextEvidence,
        hasPendingCheckIn: false,
        queueStatus: "未排队" as const,
      };

      // 仅挂号费 = 挂号缴费；否则视为检查缴费。
      const feeName = props.journey.payments.items[0]?.name ?? "";
      const isRegistrationPayment =
        props.journey.payments.items.length === 1 &&
        /挂号费|registration fee/i.test(feeName);

      if (isRegistrationPayment && flowStage === 1) {
        goHomeWithNextStage(1, 2);
        return;
      }
      if (!isRegistrationPayment && flowStage === 3) {
        goHomeWithNextStage(3, 4);
        return;
      }

      if (isRegistrationPayment) {
        const checkInEvidence = {
          ...commonEvidence,
          hasPendingCheckIn: true,
        };
        router.push(
          `/tasks/check-in?symptom=${encodeURIComponent(
            props.journey.symptomInput
          )}&department=${encodeURIComponent(props.journey.recommendation.department)}${patientParams}&${evidenceToQuery(
            checkInEvidence
          )}`
        );
        return;
      }

      router.push(
        `/tasks/print-report?symptom=${encodeURIComponent(
          props.journey.symptomInput
        )}&department=${encodeURIComponent(props.journey.recommendation.department)}${patientParams}&${evidenceToQuery(
          commonEvidence
        )}`
      );
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [isPaymentFlow, isPrintingReceipt, nextEvidence, props.journey.symptomInput, router, flowStage]);

  useEffect(() => {
    if (isPaymentFlow) return;
    if (!done || autoCountDown !== 0) return;
    if (nextTask) {
      router.push(
        `/tasks/${nextTask}?symptom=${encodeURIComponent(props.journey.symptomInput)}&department=${encodeURIComponent(
          props.journey.recommendation.department
        )}${patientParams}&${evidenceToQuery(nextEvidence)}`
      );
      return;
    }
    router.push("/");
  }, [done, autoCountDown, nextTask, nextEvidence, router, isPaymentFlow]);

  const primaryLabel = useMemo(() => {
    if (!isPaymentFlow) {
      if (props.config.slug === "queue-waiting") {
        if (stepIndex <= 1) return tt("确认", "Confirm");
        return tt("去缴费", "Go Payment");
      }
      if (props.config.slug === "check-in") return tt("确认签到", "Confirm Check-in");
      if (props.config.slug === "print-report") return tt("打印检查单并预约复诊", "Print & Book Follow-up");
      if (props.config.slug === "confirm-medicines") return tt("去药品缴费", "Go Medicine Payment");
      if (props.config.slug === "medicine-payment") return isLast ? tt("完成", "Done") : tt("去缴费", "Go Payment");
      return isLast ? tt("完成任务", "Finish") : tt("下一步", "Next");
    }
    if (stepIndex === 0) return tt("识别待缴费订单中...", "Detecting pending bill...");
    if (stepIndex === 1) return tt("去缴费", "Go Payment");
    if (stepIndex === 2) return tt("支付确认中...", "Confirming payment...");
    return isPrintingReceipt ? tt("正在一键打印...", "Printing...") : tt("一键打印", "One-click Print");
  }, [isPaymentFlow, isLast, stepIndex, isPrintingReceipt, props.config.slug, props.lang]);

  const secondaryLabel = useMemo(() => {
    return tt("返回首页", "Home");
  }, [props.lang]);

  const primaryDisabled =
    (isPaymentFlow && (stepIndex === 0 || stepIndex === 2 || isPrintingReceipt)) ||
    (isQueueWaitingFlow && stepIndex === 0);

  return (
    <div className="rounded-xl border border-white/20 bg-black/40 p-4">
      <div className="flex gap-1.5">
        {stepItems.map((_, idx) => (
          <div
            key={`${props.config.slug}-${idx}`}
            className={`h-1.5 flex-1 rounded-full ${idx <= stepIndex ? "bg-white" : "bg-white/20"}`}
          />
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-white p-4">
        <div>{renderStepAtoms(props.config.slug, stepIndex, props.journey, props.lang)}</div>

        <div className="mt-4">
          <ActionButtons
            primaryLabel={primaryLabel}
            secondaryLabel={secondaryLabel}
            disabled={primaryDisabled}
            onPrimary={() => {
              if (isCheckInFlow) {
                const checkInDoneEvidence = {
                  ...props.evidence,
                  hasPendingCheckIn: false,
                  queueStatus: "排队中" as const,
                };
                router.push(
                  `/tasks/queue-waiting?symptom=${encodeURIComponent(
                    props.journey.symptomInput
                  )}&department=${encodeURIComponent(props.journey.recommendation.department)}&flowStage=${
                    flowStage || 0
                  }${patientParams}&${evidenceToQuery(
                    checkInDoneEvidence
                  )}`
                );
                return;
              }
              if (isQueueWaitingFlow) {
                if (stepIndex < 2) {
                  if (flowStage === 2 && stepIndex === 1) {
                    goHomeWithNextStage(2, 3);
                    return;
                  }
                  setStepIndex((prev) => prev + 1);
                  return;
                }
                const paymentEvidence = {
                  ...props.evidence,
                  hasPendingCheckIn: false,
                  queueStatus: "未排队" as const,
                  unpaidOrderCount: 1,
                };
                const doctorName = props.journey.appointment.doctor.split(" ")[0] ?? "";
                router.push(
                  `/tasks/payment?symptom=${encodeURIComponent(
                    props.journey.symptomInput
                  )}&department=${encodeURIComponent(
                    props.journey.recommendation.department
                  )}&selectedDoctor=${encodeURIComponent(
                    doctorName
                  )}&paymentMode=full&flowStage=${flowStage || 0}${patientParams}&${evidenceToQuery(paymentEvidence)}`
                );
                return;
              }
              if (isConfirmMedicinesFlow) {
                router.push(
                  `/tasks/medicine-payment?symptom=${encodeURIComponent(
                    props.journey.symptomInput
                  )}&department=${encodeURIComponent(
                    props.journey.recommendation.department
                  )}&selectedDoctor=${encodeURIComponent(
                    props.journey.appointment.doctor.split(" ")[0] ?? ""
                  )}&flowStage=${flowStage || 0}${patientParams}&hasPendingCheckIn=0&unpaidOrderCount=1&reportReadyCount=0&queueStatus=未排队&needsHumanAssist=0`
                );
                return;
              }
              if (isMedicinePaymentFlow) {
                if (!isLast) {
                  setStepIndex((prev) => prev + 1);
                  return;
                }
                if (flowStage === 5) {
                  goHomeWithNextStage(5, 1);
                  return;
                }
                router.push("/");
                return;
              }
              if (isPaymentFlow) {
                if (stepIndex === 1) {
                  setStepIndex(2);
                  return;
                }
                if (stepIndex === 3) {
                  setIsPrintingReceipt(true);
                }
                return;
              }
              if (isReportFlow) {
                const originalDoctor = props.journey.appointment.doctor.split(" ")[0] ?? "";
                router.push(
                  `/register/doctors?symptom=${encodeURIComponent(
                    props.journey.symptomInput
                  )}&priority=time-first&followup=1&flowStage=${flowStage || 0}&originalDoctor=${encodeURIComponent(
                    originalDoctor
                  )}&department=${encodeURIComponent(props.journey.recommendation.department)}${patientParams}`
                );
                return;
              }
              if (!isLast) {
                setStepIndex((prev) => prev + 1);
                return;
              }
              setAutoCountDown(3);
              setDone(true);
            }}
            onSecondary={() => {
              router.push("/");
            }}
          />
          {!isPaymentFlow && !isReportFlow && isLast ? (
            <div className="mt-3 text-right">
              {done ? (
                <div className="space-y-2 text-left">
                  <p className="text-sm text-green-700">
                    {tt("任务已完成，系统将在", "Task completed. Auto redirect in")} {autoCountDown} {tt("秒后自动跳转", "seconds")}
                    {nextTask ? ` ${tt("到下一任务", "to next task")} (${nextTask})` : ` ${tt("回首页", "to home")}`}。
                  </p>
                  {nextTask ? (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/tasks/${nextTask}?symptom=${encodeURIComponent(
                            props.journey.symptomInput
                          )}&department=${encodeURIComponent(
                            props.journey.recommendation.department
                          )}${patientParams}&${evidenceToQuery(
                            nextEvidence
                          )}`
                        )
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      {tt("立即跳转下一任务", "Go to Next Task")}
                    </button>
                  ) : (
                    <Link href="/" className="text-sm font-semibold text-blue-700 underline underline-offset-4">
                      {tt("无后续任务，返回首页", "No next task, back to home")}
                    </Link>
                  )}
                </div>
              ) : (
                <Link href="/" className="text-sm font-semibold text-blue-300 underline underline-offset-4">
                  {tt("完成后返回任务首页", "Return to home after finish")}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

