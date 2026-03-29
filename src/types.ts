import {
  Scan,
  Calendar,
  CreditCard,
  ClipboardCheck,
  FileText,
  MapPin,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ScenarioId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type AppView = 'business' | 'library';
export type TipLevel = 'info' | 'warning' | 'emergency';
export type RecommendationType = 'checkin' | 'payment' | 'examination' | 'report' | 'meds';
export type AIMessageComponentType = 'medical' | 'process' | 'location' | 'tip' | 'recommendation';
export type AITaskType = 'appointment' | 'checkin' | 'payment' | 'examination' | 'report' | 'meds' | 'medical' | 'process' | 'location' | 'tip';
export type AIInlineComponentType = Exclude<AITaskType, 'appointment' | 'payment' | 'checkin' | 'report' | 'meds' | 'examination'> | 'appointment' | 'payment' | 'checkin' | 'report' | 'meds' | 'examination';

export interface Scenario {
  id: ScenarioId;
  title: string;
  subtitle?: string;
  type: string;
  icon: LucideIcon;
}

export interface MedicalData {
  symptoms?: string[];
  recommendation: string;
  confidence: number;
}

export interface ProcessData {
  steps: string[];
  currentStep?: number;
}

export interface LocationData {
  destination: string;
  floor: string;
  direction: string;
}

export interface TipData {
  level: TipLevel;
  title: string;
  content: string;
}

export interface RecommendationData {
  type: RecommendationType;
  title: string;
  target: string;
}

export interface DoctorOption {
  name: string;
  time: string;
  fee: string;
}

export interface AppointmentData {
  department: string;
  doctors?: DoctorOption[];
  title?: string;
}

export interface ExaminationItem {
  name: string;
  location: string;
}

export interface ExaminationData {
  items?: ExaminationItem[];
  title?: string;
}

export type AIComponentData = MedicalData | ProcessData | LocationData | TipData | RecommendationData | AppointmentData | ExaminationData | Record<string, unknown>;

export interface AIComponentPayload<TType extends AIMessageComponentType | AITaskType = AIMessageComponentType | AITaskType, TData = AIComponentData> {
  type: TType;
  data: TData;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  component?: AIComponentPayload<AIInlineComponentType>;
  recommendation?: RecommendationData;
}

export interface AITask {
  type: AITaskType;
  data: AIComponentData;
  title: string;
}

export type JourneyStage = 'pre_visit' | 'in_progress' | 'post_visit' | 'finished';
export type JourneyAction = 'open' | 'step_change' | 'close' | 'complete' | 'recommend' | 'select';

export interface JourneyTaskSnapshot {
  type: AITaskType;
  title: string;
  step: number;
  data: AIComponentData;
  status: 'in_progress';
  lastUpdatedAt: number;
}

export interface CompletedTaskRecord {
  type: string;
  title: string;
  status: 'completed';
  timestamp: number;
}

export interface ComponentUsageRecord {
  componentType: AITaskType;
  taskType: AITaskType;
  action: JourneyAction;
  step: number;
  selection?: Record<string, unknown>;
  timestamp: number;
}

export interface JourneyContext {
  currentJourneyStage: JourneyStage;
  activeTaskSnapshot: JourneyTaskSnapshot | null;
  completedTasks: CompletedTaskRecord[];
  componentUsage: ComponentUsageRecord[];
  lastRecommendation: RecommendationData | null;
}

export const SCENARIOS: Scenario[] = [
  { id: 1, title: '首次触达', type: '任务识别首页', icon: Scan },
  { id: 2, title: '到院签到', type: '签到任务页', icon: ClipboardCheck },
  { id: 3, title: '预约挂号', type: '预约分流页', icon: Calendar },
  { id: 4, title: '待缴费', type: '缴费任务页', icon: CreditCard },
  { id: 5, title: '检查准备', type: '检查准备页', icon: ClipboardCheck },
  { id: 6, title: '取报告', type: '报告获取页', icon: FileText },
  { id: 7, title: '寻路导航', type: '寻路页', icon: MapPin },
  { id: 8, title: '异常处理', type: '异常任务页', icon: AlertCircle },
  { id: 9, title: '完成离场', type: '完成与离场页', icon: LogOut },
];
