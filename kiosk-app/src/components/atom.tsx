import React from "react";
import { AppLang, tr } from "../lib/i18n-shared";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  Pill,
  Stethoscope,
  Users,
} from "lucide-react";

/**
 * 任务状态头。
 */
export const TaskStatusHeader: React.FC<{
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
  description?: string;
}> = ({ title, status, description }) => {
  const statusConfig = {
    pending: { color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
    processing: { color: "text-orange-600", bg: "bg-orange-50", icon: Loader2 },
    completed: { color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
    failed: { color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border border-transparent p-4 ${config.bg}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-full bg-white p-2 shadow-sm ${config.color}`}>
          <Icon size={20} className={status === "processing" ? "animate-spin" : ""} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-gray-600">{description}</p> : null}
        </div>
      </div>
    </div>
  );
};

/**
 * 医院/科室/地点信息卡。
 */
export const LocationCard: React.FC<{
  hospital: string;
  department: string;
  address?: string;
  room?: string;
  lang?: AppLang;
}> = ({ hospital, department, address, room, lang = "zh" }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
        <MapPin size={18} />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-gray-900">{hospital}</div>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <Stethoscope size={14} />
          {department} {room ? <span className="text-gray-400">| {room}</span> : null}
        </div>
        {address ? <div className="mt-2 text-xs italic text-gray-400">{address}</div> : null}
      </div>
    </div>
  </div>
);

/**
 * 时间/预约卡。
 */
export const TimeCard: React.FC<{
  date: string;
  timeSlot: string;
  type?: "appointment" | "deadline";
  lang?: AppLang;
}> = ({ date, timeSlot, type = "appointment", lang = "zh" }) => (
  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
        <Calendar size={18} />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {type === "appointment" ? tr(lang, "预约时间", "Appointment") : tr(lang, "截止时间", "Deadline")}
        </div>
        <div className="font-bold text-gray-900">{date}</div>
      </div>
    </div>
    <div className="text-right text-lg font-bold font-mono text-purple-600">{timeSlot}</div>
  </div>
);

/**
 * 候诊/排队状态卡。
 */
export const QueueStatusCard: React.FC<{
  currentNumber: string;
  waitingCount: number;
  estimatedTime?: string;
  lang?: AppLang;
}> = ({ currentNumber, waitingCount, estimatedTime, lang = "zh" }) => (
  <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg">
    <div className="mb-4 flex items-start justify-between">
      <div>
        <div className="text-sm font-medium text-blue-100">{tr(lang, "当前叫号", "Current Number")}</div>
        <div className="mt-1 text-3xl font-black tracking-tighter">{currentNumber}</div>
      </div>
      <div className="rounded-lg bg-white/10 p-2 backdrop-blur-sm">
        <Users size={20} />
      </div>
    </div>
    <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm">
      <div>
        {tr(lang, "前面还有", "People ahead")} <span className="mx-1 text-lg font-bold">{waitingCount}</span> {tr(lang, "人", "")}
      </div>
      {estimatedTime ? (
        <div className="rounded-full bg-white/20 px-2 py-1 text-xs">{tr(lang, "预计等待", "Estimated wait")} {estimatedTime}</div>
      ) : null}
    </div>
  </div>
);

/**
 * 缴费摘要卡。
 */
export const PaymentSummaryCard: React.FC<{
  items: { name: string; price: number }[];
  total: number;
  status?: "unpaid" | "paid";
  lang?: AppLang;
}> = ({ items, total, status = "unpaid", lang = "zh" }) => (
  <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 p-4">
      <div className="flex items-center gap-2 font-semibold text-gray-700">
        <CreditCard size={16} />
        {tr(lang, "费用明细", "Fee Details")}
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          status === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
        }`}
      >
        {status === "paid" ? tr(lang, "已支付", "Paid") : tr(lang, "待支付", "Unpaid")}
      </span>
    </div>
    <div className="space-y-2 p-4">
      {items.map((item, idx) => (
        <div key={`${item.name}-${idx}`} className="flex justify-between text-sm">
          <span className="text-gray-600">{item.name}</span>
          <span className="font-mono text-gray-900">¥{item.price.toFixed(2)}</span>
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-gray-200 pt-3">
        <span className="font-bold text-gray-900">{tr(lang, "合计", "Total")}</span>
        <span className="text-2xl font-black font-mono text-red-600">¥{total.toFixed(2)}</span>
      </div>
    </div>
  </div>
);

/**
 * 报告状态卡。
 */
export const ReportStatusCard: React.FC<{
  title: string;
  date: string;
  status: "ready" | "processing";
  id?: string;
  lang?: AppLang;
}> = ({ title, date, status, id, lang = "zh" }) => (
  <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className={`rounded-xl p-3 ${status === "ready" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
      <FileText size={24} />
    </div>
    <div className="flex-1">
      <h3 className="font-bold text-gray-900">{title}</h3>
      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
        <span>{date}</span>
        {id ? <span>ID: {id}</span> : null}
      </div>
    </div>
    <div>
      {status === "ready" ? (
        <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700">
          {tr(lang, "查看报告", "View Report")}
        </button>
      ) : (
        <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
          <Loader2 size={12} className="animate-spin" /> {tr(lang, "生成中", "Generating")}
        </div>
      )}
    </div>
  </div>
);

/**
 * 取药信息卡。
 */
export const PharmacyCard: React.FC<{
  window: string;
  code: string;
  medicines: string[];
  lang?: AppLang;
}> = ({ window, code, medicines, lang = "zh" }) => (
  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
    <div className="mb-4 flex items-center gap-2 font-bold text-emerald-700">
      <Pill size={18} />
      {tr(lang, "取药指引", "Pharmacy Guide")}
    </div>
    <div className="mb-4 grid grid-cols-2 gap-4">
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="text-[10px] font-bold uppercase text-gray-400">{tr(lang, "取药窗口", "Pickup Window")}</div>
        <div className="text-xl font-black text-emerald-600">{window}</div>
      </div>
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="text-[10px] font-bold uppercase text-gray-400">{tr(lang, "取药凭证码", "Pickup Code")}</div>
        <div className="font-mono text-xl font-black text-emerald-600">{code}</div>
      </div>
    </div>
    <div className="space-y-1">
      <div className="mb-1 text-xs font-bold text-emerald-600">{tr(lang, "药品清单", "Medicine List")}</div>
      {medicines.map((m, i) => (
        <div key={`${m}-${i}`} className="flex items-center gap-2 text-sm text-gray-700">
          <div className="h-1 w-1 rounded-full bg-emerald-400" />
          {m}
        </div>
      ))}
    </div>
  </div>
);

/**
 * 空/加载/错误状态块。
 */
export const StateBlock: React.FC<{
  type: "empty" | "loading" | "error";
  message?: string;
  lang?: AppLang;
}> = ({ type, message, lang = "zh" }) => {
  const configs = {
    empty: { icon: FileText, color: "text-gray-300", defaultMsg: tr(lang, "暂无相关数据", "No related data") },
    loading: { icon: Loader2, color: "text-blue-400", defaultMsg: tr(lang, "正在努力加载中...", "Loading...") },
    error: { icon: AlertCircle, color: "text-red-400", defaultMsg: tr(lang, "服务暂时不可用", "Service temporarily unavailable") },
  };
  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className={`mb-4 ${config.color}`}>
        <Icon size={48} className={type === "loading" ? "animate-spin" : ""} strokeWidth={1.5} />
      </div>
      <p className="font-medium text-gray-500">{message || config.defaultMsg}</p>
      {type === "error" ? (
        <button className="mt-4 text-sm font-bold text-blue-600 underline underline-offset-4">
          {tr(lang, "重试一下", "Retry")}
        </button>
      ) : null}
    </div>
  );
};

/**
 * 检查项分组卡。
 */
export const ExamGroupCard: React.FC<{
  title: string;
  exams: { name: string; status: "pending" | "completed" }[];
  lang?: AppLang;
}> = ({ title, exams, lang = "zh" }) => (
  <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3 font-bold text-gray-800">
      <div className="h-4 w-1 rounded-full bg-blue-600" />
      {title}
    </div>
    <div className="divide-y divide-gray-50">
      {exams.map((exam, idx) => (
        <div key={`${exam.name}-${idx}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
          <span className="font-medium text-gray-700">{exam.name}</span>
          <div className="flex items-center gap-2">
            {exam.status === "completed" ? (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle2 size={14} /> {tr(lang, "已完成", "Completed")}
              </span>
            ) : (
              <span className="text-xs font-medium text-orange-500">{tr(lang, "待检查", "Pending")}</span>
            )}
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * 操作按钮区。
 */
export const ActionButtons: React.FC<{
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  disabled?: boolean;
}> = ({ primaryLabel, secondaryLabel, onPrimary, onSecondary, disabled }) => (
  <div className="sticky bottom-0 left-0 right-0 flex gap-3 border-t border-gray-100 bg-white/80 p-4 backdrop-blur-md">
    {secondaryLabel ? (
      <button
        type="button"
        onClick={onSecondary}
        disabled={disabled}
        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        {secondaryLabel}
      </button>
    ) : null}
    {primaryLabel ? (
      <button
        type="button"
        onClick={onPrimary}
        disabled={disabled}
        className="flex-[2] rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
      >
        {primaryLabel}
      </button>
    ) : null}
  </div>
);

