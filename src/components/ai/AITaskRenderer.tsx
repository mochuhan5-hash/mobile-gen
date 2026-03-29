import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Headset,
  MapPin,
  Navigation,
  Pill,
  RotateCcw,
  Stethoscope,
} from 'lucide-react';
import type {
  AITask,
  AppointmentData,
  DoctorOption,
  CheckinData,
  ExaminationData,
  ExaminationItem,
  MedicalData,
  MedsData,
  PaymentData,
  ProcessData,
  TipData,
} from '../../types';

/** 费用/检验区块内的浅紫顶栏（仅色块，不再包一层带边框的内层卡片） */
const MED_CARD_HEADER = 'bg-[#F3F4FF]';

function formatYuan(amount: number): string {
  return `¥ ${amount.toFixed(2)}`;
}

interface AITaskRendererProps {
  activeTask: AITask | null;
  taskStep: number;
  setTaskStep: (value: number | ((prev: number) => number)) => void;
  setActiveTask: (task: AITask | null) => void;
  setCurrentId?: (id: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
  setMedicalRequirement?: (value: string) => void;
  completeTask?: (type: string, title: string) => void;
  recordSelection?: (selection: Record<string, unknown>) => void;
  preview?: boolean;
}

export default function AITaskRenderer({
  activeTask,
  taskStep,
  setTaskStep,
  setActiveTask,
  setCurrentId,
  setMedicalRequirement,
  completeTask,
  recordSelection,
  preview = false,
}: AITaskRendererProps) {
  const [selectedDoctorIndex, setSelectedDoctorIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedDoctorIndex(null);
  }, [activeTask]);

  if (!activeTask) return null;

  const flowActionLabel = typeof (activeTask.data as Record<string, unknown>).__standardFlowActionLabel === 'string'
    ? (activeTask.data as Record<string, unknown>).__standardFlowActionLabel as string
    : null;
  const safeClose = () => setActiveTask(null);
  const safeComplete = () => {
    if (!preview && completeTask) {
      completeTask(activeTask.type, activeTask.title);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b bg-hospital-blue p-4 text-white sm:p-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            {activeTask.type === 'medical' && <Stethoscope size={20} />}
            {activeTask.type === 'process' && <ClipboardCheck size={20} />}
            {activeTask.type === 'location' && <MapPin size={20} />}
            {activeTask.type === 'tip' && <AlertCircle size={20} />}
            {activeTask.type === 'payment' && <CreditCard size={20} />}
            {activeTask.type === 'examination' && <ClipboardList size={20} />}
            {activeTask.type === 'checkin' && <ClipboardCheck size={20} />}
            {activeTask.type === 'meds' && <Pill size={20} />}
            {activeTask.type === 'report' && <FileText size={20} />}
            {activeTask.type === 'appointment' && <Calendar size={20} />}
          </div>
          <h2 className="text-lg font-bold sm:text-xl">{activeTask.title}</h2>
        </div>
        <button onClick={safeClose} className="rounded-full p-2 transition-colors hover:bg-white/10">
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTask.type === 'appointment' && (() => {
          const doctors: DoctorOption[] =
            (activeTask.data as AppointmentData).doctors?.length
              ? (activeTask.data as AppointmentData).doctors!
              : [
                  { name: '王主任', time: '14:00', fee: '¥50' },
                  { name: '李医生', time: '15:30', fee: '¥20' },
                ];
          const confirmAppointment = () => {
            if (selectedDoctorIndex === null) return;
            const doc = doctors[selectedDoctorIndex];
            recordSelection?.({
              componentType: 'appointment',
              doctorName: doc.name,
              time: doc.time,
              fee: doc.fee,
              action: 'confirm_booking',
            });
            safeComplete();
          };
          return (
            <div className="w-full space-y-6 sm:space-y-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center">
                  <h3 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">选择医生</h3>
                  <p className="text-sm text-gray-500 sm:text-base">
                    科室：{(activeTask.data as AppointmentData).department}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4" role="radiogroup" aria-label="选择医生">
                  {doctors.map((doc, i) => {
                    const selected = selectedDoctorIndex === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedDoctorIndex(i)}
                        className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all sm:p-5 ${
                          selected
                            ? 'border-hospital-blue bg-hospital-blue/[0.06] shadow-sm ring-2 ring-hospital-blue/25'
                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/80'
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold sm:h-14 sm:w-14 sm:text-xl ${
                              selected ? 'bg-hospital-blue/15 text-hospital-blue' : 'bg-blue-100 text-hospital-blue'
                            }`}
                          >
                            {doc.name[0]}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="text-lg font-bold text-gray-800 sm:text-xl">{doc.name}</div>
                            <div className="text-sm text-gray-500 sm:text-base">今日 {doc.time}</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                          <div className="text-xl font-bold text-orange-500 sm:text-2xl">{doc.fee}</div>
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 sm:h-9 sm:w-9 ${
                              selected
                                ? 'border-hospital-blue bg-hospital-blue text-white'
                                : 'border-gray-200 bg-white'
                            }`}
                            aria-hidden
                          >
                            {selected ? (
                              <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:gap-4 sm:pt-6">
                <button
                  type="button"
                  disabled={preview || selectedDoctorIndex === null}
                  onClick={() => {
                    if (!preview) confirmAppointment();
                  }}
                  className="flex-1 rounded-2xl bg-hospital-blue py-4 text-base font-bold text-white shadow-lg transition-all enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:text-lg"
                >
                  {flowActionLabel ?? '确认预约挂号'}
                </button>
                <button
                  type="button"
                  onClick={safeClose}
                  className="rounded-2xl border-2 border-gray-200 px-6 py-4 text-base font-bold text-gray-600 transition-all hover:bg-gray-50 sm:text-lg"
                >
                  暂不挂号
                </button>
              </div>
            </div>
          );
        })()}

        {activeTask.type === 'checkin' && (() => {
          const d = activeTask.data as CheckinData;
          const callingNumber = d.callingNumber ?? 'A042';
          const aheadCount = typeof d.aheadCount === 'number' ? d.aheadCount : 5;
          const waitMinutes = typeof d.waitMinutes === 'number' ? d.waitMinutes : 15;
          return (
            <div className="w-full">
              <div className="overflow-hidden rounded-[1.25rem] bg-hospital-blue p-5 text-white shadow-lg sm:rounded-3xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white/90">当前叫号</div>
                    <div className="mt-1 truncate text-5xl font-bold tracking-tight sm:text-6xl">{callingNumber}</div>
                    {d.department ? (
                      <div className="mt-2 text-sm text-white/80">{d.department}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/15 text-white shadow-inner ring-1 ring-white/20 transition hover:bg-black/25 sm:h-14 sm:w-14"
                    aria-label="人工服务"
                  >
                    <Headset className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="my-5 border-t border-white/30 sm:my-6" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[15px] text-white sm:text-base">
                    前面还有 <span className="text-2xl font-bold sm:text-3xl">{aheadCount}</span> 人
                  </p>
                  <div className="w-fit rounded-full bg-black/20 px-4 py-2.5 text-sm font-medium text-white shadow-md ring-1 ring-white/15">
                    预计等待 约{waitMinutes}分钟
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTask.type === 'payment' && (() => {
          const d = activeTask.data as PaymentData;
          const lineItems =
            d.lineItems && d.lineItems.length > 0
              ? d.lineItems
              : [
                  { name: '血常规(五分类)', price: 45 },
                  { name: '胸部正侧位 X线', price: 120 },
                  { name: '阿莫西林胶囊', price: 32.5 },
                ];
          const total =
            typeof d.total === 'number'
              ? d.total
              : lineItems.reduce((sum, row) => sum + row.price, 0);
          const statusLabel = d.statusLabel ?? '待支付';
          return (
            <div className="w-full space-y-0">
              <div
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3.5 sm:px-4 sm:py-4 ${MED_CARD_HEADER}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <CreditCard className="h-5 w-5 shrink-0 text-gray-600" strokeWidth={1.75} />
                  <span className="truncate text-base font-bold text-gray-900 sm:text-lg">费用明细</span>
                </div>
                <span className="shrink-0 rounded-full bg-hospital-blue/12 px-3 py-1 text-xs font-semibold text-hospital-blue sm:text-sm">
                  {statusLabel}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {lineItems.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 py-3.5 text-sm sm:py-4 sm:text-base"
                  >
                    <span className="text-gray-500">{row.name}</span>
                    <span className="shrink-0 font-semibold text-gray-900">{formatYuan(row.price)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-base font-bold text-gray-900 sm:text-lg">合计</span>
                <span className="text-xl font-bold text-hospital-blue sm:text-2xl">{formatYuan(total)}</span>
              </div>
            </div>
          );
        })()}

        {activeTask.type === 'examination' && (() => {
          const d = activeTask.data as ExaminationData;
          const rawItems =
            d.items && d.items.length > 0
              ? d.items
              : [
                  { name: '血常规(五分类)', status: 'completed' as const },
                  { name: '阿莫西林胶囊', status: 'pending' as const },
                ];
          const items: ExaminationItem[] = rawItems.map((item) => ({
            ...item,
            status: item.status ?? 'pending',
          }));
          const departmentLabel = d.departmentLabel ?? '检验科（2楼）';
          return (
            <div className="w-full space-y-0">
              <div
                className={`flex items-center gap-2.5 rounded-xl px-3 py-3.5 sm:px-4 sm:py-4 ${MED_CARD_HEADER}`}
              >
                <ClipboardList className="h-5 w-5 shrink-0 text-gray-600" strokeWidth={1.75} />
                <span className="text-base font-bold text-gray-900 sm:text-lg">{departmentLabel}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((item, i) => {
                  const done = item.status === 'completed';
                  const label = done ? '已完成' : '待检查';
                  const statusClass = done ? 'text-gray-500' : 'font-medium text-hospital-blue';
                  return (
                    <button
                      key={i}
                      type="button"
                      className="flex w-full items-start justify-between gap-3 py-4 text-left transition hover:bg-gray-50/80 sm:py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-500 sm:text-base">{item.name}</div>
                        {item.location ? (
                          <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={12} className="shrink-0" />
                            {item.location}
                          </div>
                        ) : null}
                      </div>
                      <span className={`flex shrink-0 items-center gap-0.5 text-sm sm:text-base ${statusClass}`}>
                        {label}
                        <ChevronRight className="h-4 w-4 opacity-70" strokeWidth={2} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {activeTask.type === 'report' && (
          <div className="w-full space-y-6 text-center sm:space-y-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-hospital-blue sm:mb-6 sm:h-24 sm:w-24">
              <FileText size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 sm:text-3xl">报告查询与打印</h3>
            <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 text-left shadow-sm sm:space-y-6 sm:p-8">
              <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-bold">血常规检查报告</div>
                  <div className="text-sm text-gray-500">2026-03-25 10:45</div>
                </div>
                <button className="flex items-center gap-1 self-start font-bold text-hospital-blue sm:self-auto" disabled>
                  <FileText size={16} /> 打印
                </button>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="mb-1 font-bold text-hospital-blue">医生建议</div>
                <p className="text-sm text-blue-700">指标基本正常，请保持休息，多喝水。如有不适请复诊。</p>
              </div>
            </div>
          </div>
        )}

        {activeTask.type === 'meds' && (() => {
          const d = activeTask.data as MedsData;
          type MedsRow = { name: string; price?: number };
          const defaultMedicineItems: MedsRow[] = [
            { name: '阿莫西林胶囊（0.25g*24粒）', price: 32.5 },
            { name: '复方甘草口服液（100ml）', price: 12.5 },
          ];
          const medicineRows: MedsRow[] =
            d.medicineItems && d.medicineItems.length > 0
              ? d.medicineItems
              : d.medicineList && d.medicineList.length > 0
                ? d.medicineList.map((name) => ({ name }))
                : defaultMedicineItems;
          const sumFromItems = medicineRows.reduce((s, r) => s + (typeof r.price === 'number' ? r.price : 0), 0);
          const total =
            typeof d.total === 'number'
              ? d.total
              : sumFromItems > 0
                ? sumFromItems
                : 45;
          const pickupWindow = d.pickupWindow ?? '3号 门诊药房';
          const pickupCode = d.pickupCode ?? '28';
          return (
            <div className="w-full space-y-5 sm:space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 text-left">
                <span className="text-base font-bold text-gray-900 sm:text-lg">总计</span>
                <span className="text-xl font-bold text-hospital-blue sm:text-2xl">{formatYuan(total)}</span>
              </div>

              <div className="rounded-2xl bg-[#EDEEF6] p-4 sm:rounded-3xl sm:p-5">
                <div className="mb-4 flex items-center gap-2.5 sm:mb-5">
                  <Pill className="h-5 w-5 shrink-0 text-gray-600" strokeWidth={2} />
                  <span className="text-base font-bold text-gray-800 sm:text-lg">取药指引</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="rounded-xl bg-white p-4 shadow-sm sm:col-span-2 sm:p-5">
                    <div className="text-sm text-gray-500">取药窗口</div>
                    <div className="mt-1 text-2xl font-bold leading-tight text-hospital-blue sm:text-3xl">
                      {pickupWindow}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow-sm sm:col-span-1 sm:p-5">
                    <div className="text-sm text-gray-500">取药码</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-hospital-blue sm:text-3xl">
                      {pickupCode}
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <div className="mb-3 text-base font-bold text-gray-800 sm:text-lg">药品清单</div>
                  <ul className="space-y-3 text-sm text-gray-600 sm:text-base">
                    {medicineRows.map((row, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 leading-relaxed">
                        <span className="min-w-0 flex-1">
                          {i + 1}. {row.name}
                        </span>
                        {typeof row.price === 'number' ? (
                          <span className="shrink-0 font-semibold tabular-nums text-hospital-blue">
                            {formatYuan(row.price)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTask.type === 'medical' && (
          <div className="w-full space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-hospital-blue sm:h-20 sm:w-20">
                <Stethoscope size={32} />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">分诊建议</h3>
              <p className="text-sm text-gray-500 sm:text-base">根据您的描述，为您匹配到以下科室</p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 text-center sm:p-8">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-600 sm:text-sm">推荐科室</div>
              <div className="mb-3 text-3xl font-black text-hospital-blue sm:mb-4 sm:text-5xl">{(activeTask.data as MedicalData).recommendation}</div>
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-600 sm:text-base">
                <CheckCircle2 size={18} />
                智能匹配度 {Math.round(((activeTask.data as MedicalData).confidence || 0) * 100)}%
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="font-bold text-gray-700">识别到的症状：</div>
              <div className="flex flex-wrap gap-2">
                {(activeTask.data as MedicalData).symptoms?.map((s, i) => (
                  <span key={i} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm sm:px-4 sm:py-2">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {!preview && setCurrentId && setMedicalRequirement && (
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4 sm:pt-6">
                <button
                  onClick={() => {
                    recordSelection?.({
                      componentType: 'medical',
                      action: 'choose_recommendation',
                      recommendation: (activeTask.data as MedicalData).recommendation,
                      symptoms: (activeTask.data as MedicalData).symptoms ?? [],
                    });
                    setMedicalRequirement((activeTask.data as MedicalData).recommendation);
                    completeTask?.(activeTask.type, activeTask.title);
                  }}
                  className="flex-1 rounded-2xl bg-hospital-blue py-4 text-base font-bold text-white shadow-lg transition-all active:scale-95 sm:text-lg"
                >
                  {flowActionLabel ?? '立即挂号'}
                </button>
                <button onClick={safeClose} className="rounded-2xl border-2 border-gray-200 px-6 py-4 text-base font-bold text-gray-600 transition-all hover:bg-gray-50 sm:text-lg">
                  返回咨询
                </button>
              </div>
            )}
          </div>
        )}

        {activeTask.type === 'process' && (
          <div className="w-full space-y-8 sm:space-y-10">
            <div className="text-center">
              <h3 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">操作指引</h3>
              <p className="text-sm text-gray-500 sm:text-base">请按照以下步骤完成操作</p>
            </div>

            <div className="relative space-y-8 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-1 before:bg-blue-100 sm:space-y-10 sm:before:left-5">
              {(activeTask.data as ProcessData).steps?.map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-4 sm:gap-6">
                  <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md transition-all duration-500 sm:h-10 sm:w-10 sm:text-base ${
                    idx === taskStep
                      ? 'scale-110 bg-hospital-blue text-white ring-4 ring-blue-100'
                      : idx < taskStep
                        ? 'bg-green-500 text-white'
                        : 'border-2 border-gray-100 bg-white text-gray-400'
                  }`}>
                    {idx < taskStep ? <CheckCircle2 size={18} /> : idx + 1}
                  </div>
                  <div className={`flex-1 pt-1 transition-all duration-500 ${idx === taskStep ? 'text-gray-900' : 'text-gray-400'}`}>
                    <div className={`mb-1 text-lg font-bold sm:text-xl ${idx === taskStep ? 'text-hospital-blue' : ''}`}>{step}</div>
                    {idx === taskStep && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 text-sm text-gray-500 sm:text-base">
                        正在进行此步骤，完成后请点击下方按钮。
                      </motion.div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!preview && (
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4 sm:pt-6">
                {taskStep < (((activeTask.data as ProcessData).steps?.length || 1) - 1) ? (
                  <button
                    onClick={() => setTaskStep((prev) => prev + 1)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-hospital-blue py-4 text-base font-bold text-white shadow-lg transition-all active:scale-95 sm:text-lg"
                  >
                    下一步
                  </button>
                ) : (
                  <button onClick={safeComplete} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-base font-bold text-white shadow-lg transition-all active:scale-95 sm:text-lg">
                    完成任务
                  </button>
                )}
                <button onClick={safeClose} className="rounded-2xl border-2 border-gray-200 px-6 py-4 text-base font-bold text-gray-600 transition-all hover:bg-gray-50 sm:text-lg">
                  退出
                </button>
              </div>
            )}
          </div>
        )}

        {activeTask.type === 'location' && (
          <div className="w-full space-y-6 sm:space-y-8">
            <div className="rounded-3xl border border-green-100 bg-green-50 p-6 text-center sm:p-8">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 sm:mb-6 sm:h-24 sm:w-24">
                <MapPin size={40} />
              </div>
              <h3 className="mb-2 text-2xl font-black text-green-900 sm:text-3xl">{(activeTask.data as any).destination}</h3>
              <p className="text-sm text-green-700 sm:text-lg">{(activeTask.data as any).floor} | {(activeTask.data as any).direction}</p>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-500 sm:gap-3 sm:text-base">
                <Navigation size={18} />
                <span>路线预览</span>
              </div>
              <div className="flex h-40 items-center justify-center rounded-xl bg-white text-sm italic text-gray-400 sm:h-48 sm:text-base">地图加载中...</div>
            </div>
          </div>
        )}

        {activeTask.type === 'tip' && (
          <div className="flex h-full w-full flex-col items-center justify-center space-y-6 text-center sm:space-y-8">
            <div className={`flex h-24 w-24 items-center justify-center rounded-full sm:h-28 sm:w-28 ${
              (activeTask.data as TipData).level === 'emergency'
                ? 'bg-red-100 text-red-600'
                : (activeTask.data as TipData).level === 'warning'
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-blue-100 text-blue-600'
            }`}>
              <AlertCircle size={48} />
            </div>
            <div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900 sm:mb-4 sm:text-3xl">{(activeTask.data as TipData).title}</h3>
              <p className="text-base leading-relaxed text-gray-600 sm:text-xl">{(activeTask.data as TipData).content}</p>
            </div>
          </div>
        )}
      </div>

      {!preview &&
        ['checkin', 'payment', 'report', 'meds', 'examination', 'tip'].includes(activeTask.type) && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <button
              type="button"
              onClick={safeComplete}
              className="w-full rounded-2xl bg-hospital-blue py-4 text-base font-bold text-white shadow-lg transition hover:brightness-95 sm:text-lg"
            >
              {activeTask.type === 'tip' ? '知道了' : (flowActionLabel ?? '完成当前任务')}
            </button>
          </div>
        )}
    </motion.div>
  );
}
