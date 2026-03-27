import { 
  Scan, 
  Calendar, 
  HelpCircle, 
  CheckCircle2, 
  CreditCard, 
  ClipboardCheck, 
  FileText, 
  MapPin, 
  AlertCircle, 
  LogOut,
  UserPlus,
  History,
  ArrowRight,
  Printer,
  Navigation,
  PhoneCall,
  RotateCcw
} from "lucide-react";

export type ScenarioId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Scenario {
  id: ScenarioId;
  title: string;
  subtitle?: string;
  type: string;
  icon: any;
}

export const SCENARIOS: Scenario[] = [
  { id: 1, title: "首次触达", type: "任务识别首页", icon: Scan },
  { id: 2, title: "到院签到", type: "签到任务页", icon: ClipboardCheck },
  { id: 3, title: "预约挂号", type: "预约分流页", icon: Calendar },
  { id: 4, title: "待缴费", type: "缴费任务页", icon: CreditCard },
  { id: 5, title: "检查准备", type: "检查准备页", icon: ClipboardCheck },
  { id: 6, title: "取报告", type: "报告获取页", icon: FileText },
  { id: 7, title: "寻路导航", type: "寻路页", icon: MapPin },
  { id: 8, title: "异常处理", type: "异常任务页", icon: AlertCircle },
  { id: 9, title: "完成离场", type: "完成与离场页", icon: LogOut },
];
