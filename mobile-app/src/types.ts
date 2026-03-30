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
export type AppView = 'business' | 'library' | 'profile';
export type TipLevel = 'info' | 'warning' | 'emergency';
export type RecommendationType = 'checkin' | 'payment' | 'examination' | 'report' | 'meds';
export type AIMessageComponentType = 'medical' | 'process' | 'location' | 'tip' | 'recommendation' | 'resume_task';
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

export interface ResumeTaskData {
  title: string;
  target: string;
  task: AITask;
}

export interface TaskCompletionFollowUp {
  label: string;
  icon: 'location' | 'print';
  targetId?: ScenarioId;
}

export interface TaskCompletionSummary {
  title: string;
  subtitle: string;
  primaryActionLabel: string;
  notice: string;
  followUps: TaskCompletionFollowUp[];
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

export interface PaymentLineItem {
  name: string;
  /** 金额数值（元），用于展示 ¥ xx.xx */
  price: number;
}

export interface PaymentData {
  lineItems?: PaymentLineItem[];
  /** 未传时按 lineItems 合计 */
  total?: number;
  /** 右上角状态文案，默认「待支付」 */
  statusLabel?: string;
}

export interface ExaminationItem {
  name: string;
  location?: string;
  /** 已完成 / 待检查 展示样式 */
  status?: 'completed' | 'pending';
}

export interface ExaminationData {
  items?: ExaminationItem[];
  title?: string;
  /** 卡片抬头，如「检验科（2楼）」 */
  departmentLabel?: string;
}

/** 签到候诊 / 叫号展示（可选，缺省使用占位数据） */
export interface CheckinData {
  /** 当前叫号，如 A042 */
  callingNumber?: string;
  /** 前面排队人数 */
  aheadCount?: number;
  /** 预计等待分钟数 */
  waitMinutes?: number;
  /** 科室名称（展示用） */
  department?: string;
}

/** 支付取药 — 药品清单行（名称 + 单价） */
export interface MedsMedicineRow {
  name: string;
  price: number;
}

/** 支付取药 / 取药指引 */
export interface MedsData {
  /** 取药窗口，如「3号 门诊药房」 */
  pickupWindow?: string;
  pickupCode?: string | number;
  /** 药品清单（含单价）；优先于 medicineList */
  medicineItems?: MedsMedicineRow[];
  /** 仅名称、无单价（兼容旧数据） */
  medicineList?: string[];
  /** 应付合计；未传时按 medicineItems 单价求和 */
  total?: number;
}

export type AIComponentData =
  | MedicalData
  | ProcessData
  | LocationData
  | TipData
  | RecommendationData
  | ResumeTaskData
  | AppointmentData
  | PaymentData
  | ExaminationData
  | CheckinData
  | MedsData
  | Record<string, unknown>;

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

export interface VisitRecord {
  id: string;
  date: string;
  department: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
}

export interface UserBasicInfo {
  name: string;
  age: number;
  gender: string;
  phone: string;
}

export interface UserHealthProfile {
  allergies: string;
  chronicConditions: string;
  notes: string;
}

export interface UserProfile {
  basicInfo: UserBasicInfo;
  healthProfile: UserHealthProfile;
  visitRecords: VisitRecord[];
}

export interface StandardTaskFlowStep {
  componentType: AIInlineComponentType;
  title: string;
  confirmLabel?: string;
  autoAdvance?: boolean;
  allowAiInsertions?: boolean;
}

export interface StandardTaskFlow {
  taskType: Extract<AITaskType, 'appointment' | 'checkin' | 'examination' | 'report' | 'meds'>;
  title: string;
  steps: StandardTaskFlowStep[];
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
