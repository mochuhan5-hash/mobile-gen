import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Headset,
  Info,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  Stethoscope,
} from 'lucide-react';
import type {
  AITask,
  AppointmentData,
  CheckinData,
  ExaminationData,
  MedicalData,
  ProcessData,
  TipData,
} from '../../types';

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
  if (!activeTask) return null;

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
      <div
        className={`flex items-center justify-between border-b p-4 text-white sm:p-5 ${
          activeTask.type === 'checkin' ? 'bg-[#6338f1]' : 'bg-hospital-blue'
        }`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            {activeTask.type === 'medical' && <Stethoscope size={20} />}
            {activeTask.type === 'process' && <ClipboardCheck size={20} />}
            {activeTask.type === 'location' && <MapPin size={20} />}
            {activeTask.type === 'tip' && <AlertCircle size={20} />}
            {activeTask.type === 'examination' && <Search size={20} />}
            {activeTask.type === 'checkin' && <ClipboardCheck size={20} />}
          </div>
          <h2 className="text-lg font-bold sm:text-xl">{activeTask.title}</h2>
        </div>
        <button onClick={safeClose} className="rounded-full p-2 transition-colors hover:bg-white/10">
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTask.type === 'appointment' && (
          <div className="w-full space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <h3 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">选择医生</h3>
                <p className="text-sm text-gray-500 sm:text-base">科室：{(activeTask.data as AppointmentData).department}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {(((activeTask.data as AppointmentData).doctors) || [
                  { name: '王主任', time: '14:00', fee: '¥50' },
                  { name: '李医生', time: '15:30', fee: '¥20' },
                ]).map((doc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => recordSelection?.({
                      componentType: 'appointment',
                      doctorName: doc.name,
                      time: doc.time,
                      fee: doc.fee,
                    })}
                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left sm:p-5"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-hospital-blue sm:h-14 sm:w-14 sm:text-xl">
                        {doc.name[0]}
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-gray-800 sm:text-xl">{doc.name}</div>
                        <div className="text-sm text-gray-500 sm:text-base">今日 {doc.time}</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-orange-500 sm:text-2xl">{doc.fee}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTask.type === 'checkin' && (() => {
          const d = activeTask.data as CheckinData;
          const callingNumber = d.callingNumber ?? 'A042';
          const aheadCount = typeof d.aheadCount === 'number' ? d.aheadCount : 5;
          const waitMinutes = typeof d.waitMinutes === 'number' ? d.waitMinutes : 15;
          return (
            <div className="w-full">
              <div className="overflow-hidden rounded-[1.25rem] bg-[#6338f1] p-5 text-white shadow-lg sm:rounded-3xl sm:p-6">
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

        {activeTask.type === 'payment' && (
          <div className="w-full space-y-6 sm:space-y-8">
            <div className="text-center">
              <h3 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">费用结算</h3>
              <p className="text-sm text-gray-500 sm:text-base">您有 1 笔待缴费用</p>
            </div>
            <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:space-y-6 sm:p-8">
              <div className="flex items-center justify-between gap-3 border-b pb-4 text-sm sm:text-base">
                <span className="text-gray-500">项目：血常规检查</span>
                <span className="font-bold">¥ 152.00</span>
              </div>
              <div className="flex items-center justify-between text-xl font-bold sm:text-2xl">
                <span>总计</span>
                <span className="text-orange-500">¥ 152.00</span>
              </div>
            </div>
          </div>
        )}

        {activeTask.type === 'examination' && (
          <div className="w-full space-y-6 text-center sm:space-y-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 text-purple-600 sm:mb-6 sm:h-24 sm:w-24">
              <Search size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 sm:text-3xl">完成检查</h3>
            <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 text-left shadow-sm sm:space-y-6 sm:p-8">
              {(((activeTask.data as ExaminationData).items) || [
                { name: '血常规检查', location: '门诊楼 2 层检验科' },
                { name: '胸部 X 光', location: '放射科 1 层' },
              ]).map((item, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-base font-bold sm:text-lg">{item.name}</div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin size={14} /> {item.location}
                    </div>
                  </div>
                  <div className="self-start rounded-lg bg-purple-50 px-3 py-1 text-sm font-bold text-purple-600 sm:self-auto">待检查</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-left sm:p-5">
              <div className="mb-2 flex items-center gap-2 font-bold text-purple-600">
                <Info size={18} /> 检查须知
              </div>
              <p className="text-sm text-purple-700 sm:text-base">请携带就诊卡前往指定地点。部分检查可能需要排队，请耐心等候。</p>
            </div>
          </div>
        )}

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

        {activeTask.type === 'meds' && (
          <div className="w-full space-y-6 text-center sm:space-y-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-orange-600 sm:mb-6 sm:h-24 sm:w-24">
              <ClipboardCheck size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 sm:text-3xl">支付与取药</h3>
            <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 text-left shadow-sm sm:space-y-6 sm:p-8">
              <div className="flex items-center justify-between gap-3 border-b pb-4 text-sm sm:text-base">
                <span className="text-gray-500">药品：阿莫西林胶囊 x2</span>
                <span className="font-bold">¥ 45.00</span>
              </div>
              <div className="flex items-center justify-between text-xl font-bold sm:text-2xl">
                <span>总计</span>
                <span className="text-orange-500">¥ 45.00</span>
              </div>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-left sm:p-5">
              <div className="mb-2 flex items-center gap-2 font-bold text-orange-600">
                <Info size={18} /> 取药指引
              </div>
              <p className="text-sm text-orange-700 sm:text-base">支付成功后，请前往门诊楼 1 层西药房 3 号窗口取药。</p>
            </div>
          </div>
        )}

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
                    setCurrentId(3);
                    setActiveTask(null);
                  }}
                  className="flex-1 rounded-2xl bg-hospital-blue py-4 text-base font-bold text-white shadow-lg transition-all active:scale-95 sm:text-lg"
                >
                  立即挂号
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
                  <button onClick={safeClose} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-base font-bold text-white shadow-lg transition-all active:scale-95 sm:text-lg">
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

      {!preview && ['checkin', 'payment', 'report', 'meds', 'examination'].includes(activeTask.type) && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <button
            onClick={safeComplete}
            className={`w-full rounded-2xl py-4 text-base font-bold text-white shadow-lg sm:text-lg ${
              activeTask.type === 'checkin' ? 'bg-[#6338f1] hover:bg-[#5630d4]' : 'bg-hospital-blue'
            }`}
          >
            完成当前任务
          </button>
        </div>
      )}
    </motion.div>
  );
}
