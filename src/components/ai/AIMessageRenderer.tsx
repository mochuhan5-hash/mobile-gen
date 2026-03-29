import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  MapPin,
  Navigation,
  Search,
  Stethoscope,
} from 'lucide-react';
import { createTaskFromComponent } from '../../aiTaskFlow';
import type {
  AIComponentPayload,
  AIMessageComponentType,
  AITask,
  LocationData,
  MedicalData,
  ProcessData,
  RecommendationData,
  TipData,
} from '../../types';

interface AIMessageRendererProps {
  component?: AIComponentPayload<AIMessageComponentType> | null;
  onOpenTask?: (task: AITask) => void;
  preview?: boolean;
}

function RecommendationIcon({ type }: { type: RecommendationData['type'] }) {
  if (type === 'checkin') return <ClipboardCheck size={24} />;
  if (type === 'payment') return <CreditCard size={24} />;
  if (type === 'report') return <FileText size={24} />;
  if (type === 'meds') return <ClipboardCheck size={24} />;
  return <Search size={24} />;
}

export default function AIMessageRenderer({ component, onOpenTask, preview = false }: AIMessageRendererProps) {
  if (!component) return null;

  switch (component.type) {
    case 'medical': {
      const data = component.data as MedicalData;
      return (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-hospital-blue sm:text-base">
            <Stethoscope size={16} /> 智能分诊建议
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-600 sm:text-sm">识别症状：{data.symptoms?.join('、')}</div>
            <div className="text-base font-bold text-hospital-blue sm:text-lg">建议挂号：{data.recommendation}</div>
            {data.confidence > 0.8 && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 size={12} /> 匹配度高，建议前往
              </div>
            )}
          </div>
        </div>
      );
    }
    case 'process': {
      const data = component.data as ProcessData;
      return (
        <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-orange-600 sm:text-base">
            <ClipboardCheck size={16} /> 流程指引
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {data.steps?.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 sm:gap-3">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-6 sm:w-6 sm:text-xs ${
                  idx === data.currentStep ? 'bg-orange-500 text-white' : 'bg-orange-200 text-orange-700'
                }`}>
                  {idx + 1}
                </div>
                <div className={`text-xs sm:text-sm ${idx === data.currentStep ? 'font-medium text-orange-900' : 'text-orange-700'}`}>
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'location': {
      const data = component.data as LocationData;
      return (
        <div className="mt-3 rounded-xl border border-green-100 bg-green-50 p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-green-700 sm:text-base">
            <MapPin size={16} /> 位置导航
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-bold text-green-800 sm:text-lg">{data.destination}</div>
              <div className="text-xs text-green-600 sm:text-sm">{data.floor} | {data.direction}</div>
            </div>
            <button className="self-start rounded-lg bg-green-600 p-2 text-white shadow-sm sm:self-auto" disabled={preview}>
              <Navigation size={18} />
            </button>
          </div>
        </div>
      );
    }
    case 'tip': {
      const data = component.data as TipData;
      const colors = {
        info: 'bg-blue-50 border-blue-100 text-blue-700',
        warning: 'bg-yellow-50 border-yellow-100 text-yellow-700',
        emergency: 'bg-red-50 border-red-100 text-red-700',
      };
      const colorClass = colors[data.level] || colors.info;
      return (
        <div className={`mt-3 rounded-xl border p-3 sm:p-4 ${colorClass}`}>
          <div className="mb-1 flex items-center gap-2 text-sm font-bold sm:text-base">
            <AlertCircle size={16} /> {data.title}
          </div>
          <div className="text-xs opacity-90 sm:text-sm">{data.content}</div>
        </div>
      );
    }
    case 'recommendation': {
      const data = component.data as RecommendationData;
      return (
        <div className="mt-3 rounded-xl border border-hospital-blue/20 bg-gradient-to-r from-hospital-blue/10 to-blue-50 p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-hospital-blue sm:text-base">
            <Bot size={16} /> 智能建议
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hospital-blue text-white shadow-sm sm:h-12 sm:w-12">
                <RecommendationIcon type={data.type} />
              </div>
              <div>
                <div className="text-base font-bold text-gray-800 sm:text-lg">{data.title}</div>
                <div className="text-xs text-gray-500 sm:text-sm">建议前往：{data.target}</div>
              </div>
            </div>
            <button
              onClick={() => onOpenTask?.(createTaskFromComponent({ type: data.type, data }))}
              disabled={preview || !onOpenTask}
              className="flex shrink-0 items-center gap-1 self-start rounded-lg bg-hospital-blue px-3 py-2 text-sm font-bold text-white disabled:opacity-50 sm:self-auto"
            >
              立即前往 <ChevronRight size={14} />
            </button>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
