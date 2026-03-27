/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OpenAI from "openai";
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
  RotateCcw,
  Clock,
  Info,
  ChevronRight,
  User,
  Stethoscope,
  MessageSquare,
  Search,
  Send,
  Bot,
  User as UserIcon,
  Loader2
} from "lucide-react";
import { SCENARIOS, ScenarioId } from './types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: process.env.OPENAI_BASE_URL || "http://143.198.222.179:8317/v1",
  dangerouslyAllowBrowser: true,
});

interface Message {
  role: 'user' | 'model';
  text: string;
  component?: {
    type: 'medical' | 'process' | 'location' | 'tip' | 'appointment' | 'payment' | 'checkin' | 'report' | 'meds' | 'examination';
    data: any;
  };
  recommendation?: {
    type: string;
    title: string;
    data: any;
  };
}

interface TaskRecord {
  id: string;
  type: string;
  title: string;
  status: 'completed' | 'pending';
  timestamp: number;
}

export default function App() {
  const [currentId, setCurrentId] = useState<ScenarioId>(1);
  const [hasIdentity, setHasIdentity] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [medicalRequirement, setMedicalRequirement] = useState<string>("");
  const [activeTask, setActiveTask] = useState<{ type: string; data: any; title: string } | null>(null);
  const [taskStep, setTaskStep] = useState(0);
  const [history, setHistory] = useState<TaskRecord[]>([]);
  
  // AI Chat State
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '您好！我是医院问诊台咨询员。您可以向我咨询：\n1. 症状分诊（如：肚子疼挂什么科）\n2. 流程指引（如：如何取药）\n3. 位置导航（如：抽血室在哪）\n4. 紧急求助（如：感觉头晕不舒服）' }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    await sendMessage(inputValue.trim());
    setInputValue("");
  };

  const sendMessage = async (text: string) => {
    if (isLoading) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    try {
      const systemPrompt = `你是一个专业的医院问诊台咨询员。你的目标是识别用户的问题类型，并提供最合适的辅助组件或后续推荐。
          
          主要的就诊任务流：
          1. 预约挂号 (appointment): 包含分诊、选医生、支付挂号费。
          2. 签到候诊 (checkin): 挂号后，用户需要到诊室附近签到。
          3. 诊后服务: 包含缴费 (payment)、完成检查 (examination)、查看报告 (report)、支付取药 (meds)。

          组件分类：
          - medical: 症状分诊，推荐科室。
          - appointment: 预约挂号，提供医生列表。
          - checkin: 签到候诊。
          - payment: 诊后缴费。
          - examination: 完成检查（如抽血、拍片等）。
          - report: 查看/打印报告。
          - meds: 支付并取药。
          - process: 流程指引。
          - location: 位置导航。
          - tip: 快速提示。
          - recommendation: 主动推荐下一个任务。

          输出格式必须为 JSON：
          {
            "text": "给用户的文字回复",
            "category": "operation | process | information | emergency | task_recommendation",
            "component": {
              "type": "medical | appointment | checkin | payment | examination | report | meds | process | location | tip",
              "data": { ... }
            },
            "recommendation": {
              "type": "checkin | payment | examination | report | meds",
              "title": "推荐任务标题",
              "data": { ... }
            }
          }

          组件数据结构：
          - medical: { "symptoms": ["症状1"], "recommendation": "科室名", "confidence": 0.9 }
          - appointment: { "department": "科室名", "doctors": [{"name": "医生名", "time": "时间", "fee": "金额"}] }
          - examination: { "items": [{"name": "检查项1", "location": "地点"}] }
          - recommendation: { "type": "checkin", "title": "前往签到", "target": "呼吸内科" }
          
          如果用户描述了症状并询问挂什么科，请先提供 medical 组件，并询问是否需要立即预约。
          如果用户确定要挂号，请提供 appointment 组件。
          如果用户刚完成挂号，请在 recommendation 字段中推荐签到。
          如果用户完成了一个任务（如支付、检查、挂号），请务必在 recommendation 字段中主动推荐下一个逻辑步骤。
          例如：
          - 完成挂号 -> 推荐"前往签到"
          - 完成就诊 -> 推荐"诊后缴费"
          - 完成缴费 -> 推荐"前往检查"或"支付取药"
          - 完成检查 -> 推荐"查询报告"
          如果用户询问检查，请提供 examination 组件。
          如果用户询问报告，请提供 report 组件。
          如果用户询问取药，请提供 meds 组件。`;

      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({
          role: (m.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.text
        })),
        { role: "user", content: text }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: chatMessages,
        response_format: { type: "json_object" },
      });

      const resultText = completion.choices[0]?.message?.content || "{}";
      let responseData;
      try {
        responseData = JSON.parse(resultText);
      } catch (e) {
        responseData = { text: resultText, component: null };
      }
      
      const newMessage: Message = { 
        role: 'model', 
        text: responseData.text || "", 
        component: responseData.component,
        recommendation: responseData.recommendation
      };

      setMessages(prev => [...prev, newMessage]);

      // If a component is returned, activate it as a full-screen task
      if (responseData.component) {
        let title = "服务详情";
        switch (responseData.component.type) {
          case 'medical': title = "智能分诊"; break;
          case 'appointment': title = "预约挂号"; break;
          case 'checkin': title = "签到候诊"; break;
          case 'payment': title = "费用结算"; break;
          case 'report': title = "报告查询"; break;
          case 'meds': title = "支付取药"; break;
          case 'examination': title = "完成检查"; break;
          case 'process': title = "流程指引"; break;
          case 'location': title = "位置导航"; break;
          case 'tip': title = "温馨提示"; break;
        }
        setActiveTask({
          type: responseData.component.type,
          data: responseData.component.data,
          title: title
        });
        setTaskStep(responseData.component.data.currentStep || 0);
      }

      // Handle automatic navigation if medical recommendation is strong
      if (responseData.component?.type === 'medical' && responseData.component.data.recommendation) {
        // We don't auto-navigate if we are showing a task UI, unless it's explicitly desired.
        // For now, let's keep the task UI visible.
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: '抱歉，问诊台系统繁忙，请稍后再试。' }]);
    } finally {
      scrollToBottom();
      setIsLoading(false);
    }
  };

  const currentScenario = useMemo(() => 
    SCENARIOS.find(s => s.id === currentId)!, [currentId]
  );

  const renderMessageComponent = (component: any) => {
    if (!component) return null;

    switch (component.type) {
      case 'medical':
        return (
          <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-hospital-blue font-bold mb-2">
              <Stethoscope size={18} /> 智能分诊建议
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">识别症状：{component.data.symptoms?.join('、')}</div>
              <div className="text-lg font-bold text-hospital-blue">建议挂号：{component.data.recommendation}</div>
              {component.data.confidence > 0.8 && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> 匹配度高，建议前往
                </div>
              )}
            </div>
          </div>
        );
      case 'process':
        return (
          <div className="mt-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="flex items-center gap-2 text-orange-600 font-bold mb-3">
              <ClipboardCheck size={18} /> 流程指引
            </div>
            <div className="space-y-3">
              {component.data.steps?.map((step: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    idx === component.data.currentStep ? 'bg-orange-500 text-white' : 'bg-orange-200 text-orange-700'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className={`text-sm ${idx === component.data.currentStep ? 'text-orange-900 font-medium' : 'text-orange-700'}`}>
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'location':
        return (
          <div className="mt-3 p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
              <MapPin size={18} /> 位置导航
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-green-800">{component.data.destination}</div>
                <div className="text-sm text-green-600">{component.data.floor} | {component.data.direction}</div>
              </div>
              <button className="bg-green-600 text-white p-2 rounded-lg shadow-sm">
                <Navigation size={20} />
              </button>
            </div>
          </div>
        );
      case 'tip':
        const colors = {
          info: 'bg-blue-50 border-blue-100 text-blue-700',
          warning: 'bg-yellow-50 border-yellow-100 text-yellow-700',
          emergency: 'bg-red-50 border-red-100 text-red-700'
        };
        const colorClass = colors[component.data.level as keyof typeof colors] || colors.info;
        return (
          <div className={`mt-3 p-4 rounded-xl border ${colorClass}`}>
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle size={18} /> {component.data.title}
            </div>
            <div className="text-sm opacity-90">{component.data.content}</div>
          </div>
        );
      case 'recommendation':
        return (
          <div className="mt-3 p-4 bg-gradient-to-r from-hospital-blue/10 to-blue-50 rounded-xl border border-hospital-blue/20 shadow-sm">
            <div className="flex items-center gap-2 text-hospital-blue font-bold mb-3">
              <Bot size={18} /> 智能建议
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-hospital-blue text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  {component.data.type === 'checkin' && <ClipboardCheck size={24} />}
                  {component.data.type === 'payment' && <CreditCard size={24} />}
                  {component.data.type === 'report' && <FileText size={24} />}
                  {component.data.type === 'meds' && <ClipboardCheck size={24} />}
                  {component.data.type === 'examination' && <Search size={24} />}
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-800">{component.data.title}</div>
                  <div className="text-sm text-gray-500">建议前往：{component.data.target}</div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveTask({
                    type: component.data.type,
                    data: component.data,
                    title: component.data.title
                  });
                }}
                className="bg-hospital-blue text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 shrink-0"
              >
                立即前往 <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const completeTask = (type: string, title: string) => {
    const newRecord: TaskRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title,
      status: 'completed',
      timestamp: Date.now()
    };
    setHistory(prev => [newRecord, ...prev]);
    setActiveTask(null);
    setTaskStep(0);
    setCurrentId(1); // Always return to home scenario

    // Trigger follow-up recommendation after a short delay
    setTimeout(() => {
      sendMessage(`我已完成${title}，请根据我的就诊流程推荐下一步任务。`);
    }, 800);
  };

  const renderTaskUI = () => {
    if (!activeTask) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xl"
      >
        <div className="p-6 border-b flex items-center justify-between bg-hospital-blue text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              {activeTask.type === 'medical' && <Stethoscope size={24} />}
              {activeTask.type === 'process' && <ClipboardCheck size={24} />}
              {activeTask.type === 'location' && <MapPin size={24} />}
              {activeTask.type === 'tip' && <AlertCircle size={24} />}
              {activeTask.type === 'examination' && <Search size={24} />}
            </div>
            <h2 className="text-2xl font-bold">{activeTask.title}</h2>
          </div>
          <button 
            onClick={() => setActiveTask(null)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTask.type === 'appointment' && (
            <div className="w-full space-y-8">
              {taskStep === 0 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">选择医生</h3>
                    <p className="text-gray-500">科室：{activeTask.data.department}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {(activeTask.data.doctors || [
                      { name: "王主任", time: "14:00", fee: "¥50" },
                      { name: "李医生", time: "15:30", fee: "¥20" }
                    ]).map((doc: any, i: number) => (
                      <button 
                        key={i}
                        onClick={() => setTaskStep(1)}
                        className="flex items-center justify-between p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-hospital-blue hover:bg-blue-50/30 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-hospital-blue font-bold text-xl">
                            {doc.name[0]}
                          </div>
                          <div className="text-left">
                            <div className="text-xl font-bold text-gray-800">{doc.name}</div>
                            <div className="text-gray-500">今日 {doc.time}</div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-orange-500">{doc.fee}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {taskStep === 1 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">确认预约信息</h3>
                    <p className="text-gray-500">请核对您的挂号信息</p>
                  </div>
                  <div className="bg-gray-50 rounded-3xl p-8 space-y-4 border border-gray-100">
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-500">就诊人</span>
                      <span className="font-bold">张三</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-500">科室</span>
                      <span className="font-bold">{activeTask.data.department}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-500">挂号费</span>
                      <span className="font-bold text-orange-500">¥ 50.00</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTaskStep(2)}
                    className="w-full bg-hospital-blue text-white py-5 rounded-2xl text-xl font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    确认并支付 <CreditCard size={24} />
                  </button>
                </div>
              )}

              {taskStep === 2 && (
                <div className="text-center space-y-8 py-10">
                  <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={64} />
                  </div>
                  <h3 className="text-4xl font-bold text-gray-900">挂号成功</h3>
                  <div className="text-xl text-gray-600 space-y-2">
                    <p>预约单号：RE{Math.floor(Math.random() * 1000000)}</p>
                    <p className="font-bold text-hospital-blue">请前往门诊楼 3 层呼吸内科签到</p>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-left max-w-md mx-auto">
                    <div className="flex items-center gap-2 text-hospital-blue font-bold mb-2">
                      <Info size={20} /> 温馨提示
                    </div>
                    <p className="text-blue-700">您可以离开此终端，前往诊室旁的一体机进行签到。系统已为您同步信息。</p>
                  </div>
                  <button 
                    onClick={() => completeTask('appointment', `预约挂号 - ${activeTask.data.department}`)}
                    className="w-full bg-gray-900 text-white py-5 rounded-2xl text-xl font-bold shadow-lg"
                  >
                    返回主页
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTask.type === 'checkin' && (
            <div className="w-full space-y-8 text-center">
              <div className="w-24 h-24 bg-blue-100 text-hospital-blue rounded-full flex items-center justify-center mx-auto mb-6">
                <ClipboardCheck size={48} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">签到候诊</h3>
              <div className="bg-white border-2 border-hospital-blue rounded-3xl p-8 shadow-sm">
                <div className="text-sm text-hospital-blue font-bold uppercase tracking-wider mb-2">当前候诊</div>
                <div className="text-5xl font-black text-gray-900 mb-4">呼吸内科</div>
                <div className="text-xl text-gray-500">前面还有 <span className="text-hospital-blue font-bold">3</span> 人</div>
              </div>
              <p className="text-gray-500 text-lg">签到成功！请在候诊区等候叫号。</p>
              <button 
                onClick={() => completeTask('checkin', '签到候诊 - 呼吸内科')}
                className="w-full bg-hospital-blue text-white py-5 rounded-2xl text-xl font-bold shadow-lg"
              >
                完成签到
              </button>
            </div>
          )}

          {activeTask.type === 'payment' && (
            <div className="w-full space-y-8">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">费用结算</h3>
                <p className="text-gray-500">您有 1 笔待缴费用</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center pb-4 border-b">
                  <span className="text-gray-500">项目：血常规检查</span>
                  <span className="font-bold">¥ 152.00</span>
                </div>
                <div className="flex justify-between items-center text-2xl font-bold">
                  <span>总计</span>
                  <span className="text-orange-500">¥ 152.00</span>
                </div>
              </div>
              <button 
                onClick={() => completeTask('payment', '诊后缴费 - ¥152.00')}
                className="w-full bg-orange-500 text-white py-5 rounded-2xl text-xl font-bold shadow-lg flex items-center justify-center gap-2"
              >
                立即支付 <CreditCard size={24} />
              </button>
            </div>
          )}

          {activeTask.type === 'examination' && (
            <div className="w-full space-y-8 text-center">
              <div className="w-24 h-24 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search size={48} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">完成检查</h3>
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6 text-left">
                {(activeTask.data.items || [
                  { name: "血常规检查", location: "门诊楼 2 层检验科" },
                  { name: "胸部 X 光", location: "放射科 1 层" }
                ]).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-bold text-lg">{item.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin size={14} /> {item.location}
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-purple-50 text-purple-600 text-sm font-bold rounded-lg">
                      待检查
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 text-left">
                <div className="flex items-center gap-2 text-purple-600 font-bold mb-2">
                  <Info size={20} /> 检查须知
                </div>
                <p className="text-purple-700">请携带就诊卡前往指定地点。部分检查可能需要排队，请耐心等候。</p>
              </div>
              <button 
                onClick={() => completeTask('examination', '完成检查')}
                className="w-full bg-purple-600 text-white py-5 rounded-2xl text-xl font-bold shadow-lg"
              >
                确认已完成
              </button>
            </div>
          )}

          {activeTask.type === 'report' && (
            <div className="w-full space-y-8 text-center">
              <div className="w-24 h-24 bg-blue-100 text-hospital-blue rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText size={48} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">报告查询与打印</h3>
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6 text-left">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-bold">血常规检查报告</div>
                    <div className="text-sm text-gray-500">2026-03-25 10:45</div>
                  </div>
                  <button className="text-hospital-blue font-bold flex items-center gap-1">
                    <Printer size={18} /> 打印
                  </button>
                </div>
                <div className="p-4 border border-blue-100 bg-blue-50 rounded-xl">
                  <div className="text-hospital-blue font-bold mb-1">医生建议</div>
                  <p className="text-sm text-blue-700">指标基本正常，请保持休息，多喝水。如有不适请复诊。</p>
                </div>
              </div>
              <button 
                onClick={() => completeTask('report', '取报告 - 血常规')}
                className="w-full bg-hospital-blue text-white py-5 rounded-2xl text-xl font-bold shadow-lg"
              >
                完成
              </button>
            </div>
          )}

          {activeTask.type === 'meds' && (
            <div className="w-full space-y-8 text-center">
              <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <ClipboardCheck size={48} />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">支付与取药</h3>
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6 text-left">
                <div className="flex justify-between items-center pb-4 border-b">
                  <span className="text-gray-500">药品：阿莫西林胶囊 x2</span>
                  <span className="font-bold">¥ 45.00</span>
                </div>
                <div className="flex justify-between items-center text-2xl font-bold">
                  <span>总计</span>
                  <span className="text-orange-500">¥ 45.00</span>
                </div>
              </div>
              <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 text-left">
                <div className="flex items-center gap-2 text-orange-600 font-bold mb-2">
                  <Info size={20} /> 取药指引
                </div>
                <p className="text-orange-700">支付成功后，请前往门诊楼 1 层西药房 3 号窗口取药。</p>
              </div>
              <button 
                onClick={() => completeTask('meds', '支付取药 - ¥45.00')}
                className="w-full bg-orange-500 text-white py-5 rounded-2xl text-xl font-bold shadow-lg flex items-center justify-center gap-2"
              >
                立即支付并取药 <CreditCard size={24} />
              </button>
            </div>
          )}

          {activeTask.type === 'medical' && (
            <div className="w-full space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 text-hospital-blue rounded-full mb-4">
                  <Stethoscope size={40} />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">分诊建议</h3>
                <p className="text-gray-500">根据您的描述，为您匹配到以下科室</p>
              </div>

              <div className="bg-blue-50 rounded-3xl p-8 border border-blue-100 text-center">
                <div className="text-sm text-blue-600 font-bold uppercase tracking-wider mb-2">推荐科室</div>
                <div className="text-5xl font-black text-hospital-blue mb-4">{activeTask.data.recommendation}</div>
                <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                  <CheckCircle2 size={20} />
                  智能匹配度 {Math.round(activeTask.data.confidence * 100)}%
                </div>
              </div>

              <div className="space-y-4">
                <div className="font-bold text-gray-700">识别到的症状：</div>
                <div className="flex flex-wrap gap-2">
                  {activeTask.data.symptoms?.map((s: string, i: number) => (
                    <span key={i} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-8 flex gap-4">
                <button 
                  onClick={() => {
                    setMedicalRequirement(activeTask.data.recommendation);
                    setCurrentId(3);
                    setActiveTask(null);
                  }}
                  className="flex-1 bg-hospital-blue text-white py-5 rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all"
                >
                  立即挂号
                </button>
                <button 
                  onClick={() => setActiveTask(null)}
                  className="px-8 py-5 border-2 border-gray-200 text-gray-600 rounded-2xl text-xl font-bold hover:bg-gray-50 transition-all"
                >
                  返回咨询
                </button>
              </div>
            </div>
          )}

          {activeTask.type === 'process' && (
            <div className="w-full space-y-10">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">操作指引</h3>
                <p className="text-gray-500">请按照以下步骤完成操作</p>
              </div>

              <div className="relative space-y-12 before:absolute before:left-6 before:top-4 before:bottom-4 before:w-1 before:bg-blue-100">
                {activeTask.data.steps?.map((step: string, idx: number) => (
                  <div key={idx} className="relative flex items-start gap-8">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl font-bold z-10 shadow-md transition-all duration-500 ${
                      idx === taskStep 
                      ? 'bg-hospital-blue text-white ring-4 ring-blue-100 scale-110' 
                      : idx < taskStep 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white text-gray-400 border-2 border-gray-100'
                    }`}>
                      {idx < taskStep ? <CheckCircle2 size={24} /> : idx + 1}
                    </div>
                    <div className={`flex-1 pt-2 transition-all duration-500 ${idx === taskStep ? 'text-gray-900' : 'text-gray-400'}`}>
                      <div className={`text-2xl font-bold mb-1 ${idx === taskStep ? 'text-hospital-blue' : ''}`}>
                        {step}
                      </div>
                      {idx === taskStep && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-lg text-gray-500 mt-2"
                        >
                          正在进行此步骤，完成后请点击下方按钮。
                        </motion.div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 flex gap-4">
                {taskStep < (activeTask.data.steps?.length - 1) ? (
                  <button 
                    onClick={() => setTaskStep(prev => prev + 1)}
                    className="flex-1 bg-hospital-blue text-white py-5 rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    下一步 <ArrowRight size={24} />
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveTask(null)}
                    className="flex-1 bg-green-600 text-white py-5 rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    完成任务 <CheckCircle2 size={24} />
                  </button>
                )}
                <button 
                  onClick={() => setActiveTask(null)}
                  className="px-8 py-5 border-2 border-gray-200 text-gray-600 rounded-2xl text-xl font-bold hover:bg-gray-50 transition-all"
                >
                  退出
                </button>
              </div>
            </div>
          )}

          {activeTask.type === 'location' && (
            <div className="w-full space-y-8">
              <div className="bg-green-50 rounded-3xl p-10 border border-green-100 text-center">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin size={48} />
                </div>
                <h3 className="text-4xl font-black text-green-900 mb-2">{activeTask.data.destination}</h3>
                <p className="text-xl text-green-700">{activeTask.data.floor} | {activeTask.data.direction}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-300">
                <div className="flex items-center gap-3 text-gray-500 mb-4">
                  <Navigation size={20} />
                  <span className="font-bold">路线预览</span>
                </div>
                <div className="h-48 bg-white rounded-xl flex items-center justify-center text-gray-400 italic">
                  地图加载中...
                </div>
              </div>

              <button 
                onClick={() => setActiveTask(null)}
                className="w-full bg-green-600 text-white py-5 rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all"
              >
                完成导航
              </button>
            </div>
          )}

          {activeTask.type === 'tip' && (
            <div className="w-full h-full flex flex-col justify-center items-center text-center space-y-8">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                activeTask.data.level === 'emergency' ? 'bg-red-100 text-red-600' : 
                activeTask.data.level === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
              }`}>
                <AlertCircle size={64} />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-gray-900 mb-4">{activeTask.data.title}</h3>
                <p className="text-2xl text-gray-600 leading-relaxed">{activeTask.data.content}</p>
              </div>
              <button 
                onClick={() => setActiveTask(null)}
                className="px-12 py-5 bg-gray-900 text-white rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all"
              >
                关闭提示
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderContent = () => {
    switch (currentId) {
      case 1:
        return (
          <div className="flex flex-col gap-6 w-full h-full">
            {!hasIdentity ? (
              <>
                <div className="text-center shrink-0">
                  <p className="text-lg text-gray-500">AI 助手将根据您的描述为您精准分诊</p>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col">
                  {activeTask ? renderTaskUI() : (
                    <div className="flex-1 bg-white rounded-3xl card-shadow overflow-hidden flex flex-col border border-gray-100">
                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gray-50/50">
                        {messages.length === 1 && (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-20 h-20 bg-hospital-blue text-white rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                              <Bot size={40} />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">您好，我是 AI 咨询员</h2>
                            <p className="text-gray-500 mb-10 max-w-md">我可以为您提供分诊建议、流程指引、位置导航等服务。请问有什么可以帮您？</p>
                            
                            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                              {[
                                { icon: Stethoscope, label: "症状分诊", color: "bg-blue-50 text-blue-600", text: "我肚子疼挂什么科？" },
                                { icon: ClipboardCheck, label: "取药流程", color: "bg-orange-50 text-orange-600", text: "如何取药？" },
                                { icon: MapPin, label: "位置导航", color: "bg-green-50 text-green-600", text: "抽血室在哪里？" },
                                { icon: AlertCircle, label: "紧急求助", color: "bg-red-50 text-red-600", text: "感觉头晕不舒服" }
                              ].map((action, i) => (
                                <button 
                                  key={i}
                                  onClick={() => sendMessage(action.text)}
                                  className="flex flex-col items-center gap-3 p-6 bg-white border border-gray-100 rounded-2xl hover:border-hospital-blue hover:shadow-md transition-all group"
                                >
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                                    <action.icon size={24} />
                                  </div>
                                  <span className="font-bold text-gray-700">{action.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {messages.length > 1 && messages.map((msg, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              msg.role === 'user' ? 'bg-hospital-blue text-white' : 'bg-white text-hospital-blue shadow-sm'
                            }`}>
                              {msg.role === 'user' ? <UserIcon size={20} /> : <Bot size={20} />}
                            </div>
                            <div className={`max-w-[85%] p-6 rounded-2xl text-2xl shadow-sm ${
                              msg.role === 'user' 
                              ? 'bg-hospital-blue text-white rounded-tr-none' 
                              : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                            }`}>
                              {msg.text}
                              {msg.role === 'model' && renderMessageComponent(msg.component)}
                              {msg.role === 'model' && msg.recommendation && renderMessageComponent({ type: 'recommendation', data: msg.recommendation })}
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-white text-hospital-blue shadow-sm flex items-center justify-center">
                              <Bot size={20} />
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                              <Loader2 size={24} className="animate-spin text-hospital-blue" />
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Input Area */}
                      <div className="p-4 bg-white border-t flex items-center gap-4">
                        <input 
                          type="text" 
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="请描述您的问题，例如：如何取药？或者：肚子疼挂什么科？" 
                          className="flex-1 text-2xl p-6 outline-none bg-gray-50 rounded-2xl border border-transparent focus:border-hospital-blue transition-all"
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={isLoading || !inputValue.trim()}
                          className="bg-hospital-blue text-white p-4 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                        >
                          <Send size={24} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom actions removed */}
              </>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-hospital-blue rounded-full flex items-center justify-center text-white text-2xl font-bold">张</div>
                    <div>
                      <div className="text-2xl font-bold">张三，你好</div>
                      <div className="text-gray-500">
                        {history.length > 0 ? `您已完成 ${history.length} 项任务` : '今日已为您识别到 6 项待办事项'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setHasIdentity(false)} className="text-hospital-blue font-bold text-lg">更换就诊人</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Active/Pending Tasks */}
                  {[
                    { title: "预约挂号", desc: "呼吸内科 / 专家门诊", icon: Calendar, target: 3 },
                    { title: "签到候诊", desc: "呼吸内科门诊 (10:30)", icon: ClipboardCheck, target: 2 },
                    { title: "诊后缴费", desc: "待缴费 1 笔 (¥152.00)", icon: CreditCard, target: 4 },
                    { title: "完成检查", desc: "血常规 / 胸部 X 光", icon: Search, target: 5 },
                    { title: "取报告", desc: "血常规报告已出", icon: FileText, target: 6 },
                    { title: "支付取药", desc: "待支付 1 笔 (¥45.00)", icon: ClipboardCheck, target: 1, taskType: 'meds' }
                  ].map((task, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        if (task.taskType) {
                          setActiveTask({
                            type: task.taskType,
                            data: {},
                            title: task.title
                          });
                        } else {
                          setCurrentId(task.target as ScenarioId);
                        }
                      }}
                      className="task-card flex-row items-center justify-between p-6 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-hospital-blue">
                          <task.icon size={28} />
                        </div>
                        <div className="text-left">
                          <div className="text-xl font-bold">{task.title}</div>
                          <div className="text-sm text-gray-500">{task.desc}</div>
                        </div>
                      </div>
                      <ArrowRight size={20} className="text-gray-300 group-hover:text-hospital-blue group-hover:translate-x-2 transition-all" />
                    </button>
                  ))}

                  {/* Task History */}
                  {history.length > 0 && (
                    <div className="space-y-4">
                      <div className="text-lg font-bold text-gray-500 px-2">最近完成</div>
                      {history.map((record) => (
                        <div 
                          key={record.id}
                          className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 opacity-70"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                              <CheckCircle2 size={24} />
                            </div>
                            <div>
                              <div className="text-xl font-bold text-gray-800">{record.title}</div>
                              <div className="text-sm text-gray-400">{new Date(record.timestamp).toLocaleTimeString()} 已完成</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setHasIdentity(false)}
                  className="mt-4 bg-white border-2 border-hospital-blue text-hospital-blue py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
                >
                  <MessageSquare size={20} /> 我有新的就诊需求 (AI问诊)
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-10 w-full text-center">
            <div>
              <h1 className="text-5xl font-bold mb-4">你现在先签到</h1>
              <p className="text-2xl text-gray-500">你今天有一条待签到门诊</p>
            </div>

            <div className="bg-white p-10 rounded-3xl card-shadow border-t-8 border-hospital-blue">
              <div className="flex flex-col gap-8">
                <div className="flex justify-between items-center border-b pb-6">
                  <span className="text-xl text-gray-500">科室</span>
                  <span className="text-3xl font-bold">呼吸内科门诊</span>
                </div>
                <div className="flex justify-between items-center border-b pb-6">
                  <span className="text-xl text-gray-500">就诊时间</span>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-hospital-blue">10:30 - 11:00</span>
                    <div className="text-sm text-red-500 mt-1 font-bold">请在 10:45 前完成签到</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xl text-gray-500">就诊地点</span>
                  <span className="text-3xl font-bold">门诊楼 3 层 A 区</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <button onClick={() => setCurrentId(7)} className="btn-primary py-8">立即签到</button>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setCurrentId(7)} className="btn-secondary">查看地点</button>
                <button onClick={() => setHasIdentity(false)} className="btn-secondary">更换就诊人</button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col gap-12 w-full">
            {medicalRequirement ? (
              <div className="flex flex-col gap-8">
                <div className="text-center">
                  <h1 className="text-5xl font-bold mb-4">为您推荐的挂号科室</h1>
                  <p className="text-2xl text-gray-500">根据您的需求：<span className="text-hospital-blue font-bold">“{medicalRequirement}”</span></p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {[
                    { dept: "呼吸内科", doctor: "王主任", time: "今日下午 14:00", fee: "¥50", tags: ["专家号", "推荐"] },
                    { dept: "全科门诊", doctor: "普通号", time: "今日下午 13:30", fee: "¥20", tags: ["普通号"] },
                    { dept: "急诊内科", doctor: "值班医生", time: "即刻就诊", fee: "¥30", tags: ["急诊"] }
                  ].map((item, i) => (
                    <button key={i} className="task-card flex-row items-center justify-between p-10 group border-l-8 border-l-hospital-blue">
                      <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-hospital-blue">
                          <Stethoscope size={40} />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-3xl font-bold">{item.dept}</span>
                            {item.tags.map(tag => (
                              <span key={tag} className={`text-sm px-2 py-1 rounded ${tag === '推荐' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{tag}</span>
                            ))}
                          </div>
                          <div className="text-xl text-gray-500">{item.doctor} · {item.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-4xl font-bold text-orange-500">{item.fee}</div>
                        <button onClick={() => setCurrentId(4)} className="bg-hospital-blue text-white px-8 py-4 rounded-xl text-xl font-bold shadow-lg group-hover:scale-105 transition-transform">
                          立即挂号
                        </button>
                      </div>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    setMedicalRequirement("");
                    setIsFirstTime(false);
                  }}
                  className="text-xl text-gray-400 font-bold mt-4"
                >
                  重新输入需求
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-5xl font-bold text-center">这次想怎么预约？</h1>
                
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { title: "我知道挂哪个科", desc: "直接选择科室/医生", icon: UserPlus },
                    { title: "我不确定挂哪个科", desc: "按症状智能导诊", icon: HelpCircle },
                    { title: "复诊找医生", desc: "找上次看过的医生", icon: History }
                  ].map((item, i) => (
                    <button key={i} className="task-card h-80 justify-center items-center text-center p-10">
                      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-hospital-blue mb-4">
                        <item.icon size={48} />
                      </div>
                      <div className="text-2xl font-bold mb-2">{item.title}</div>
                      <div className="text-lg text-gray-400">{item.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-center gap-8 mt-4">
                  <button className="text-xl text-gray-400 font-bold flex items-center gap-2">
                    查看全部科室 <ChevronRight size={20} />
                  </button>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <button className="text-xl text-gray-400 font-bold flex items-center gap-2">
                    帮家人预约 <User size={20} />
                  </button>
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col gap-10 w-full text-center">
            <div>
              <h1 className="text-5xl font-bold mb-4">你现在需要先缴费</h1>
              <p className="text-2xl text-gray-500">缴费后可继续后续就诊/检查</p>
            </div>

            <div className="bg-white p-10 rounded-3xl card-shadow border-t-8 border-orange-400">
              <div className="flex flex-col gap-8">
                <div className="flex justify-between items-center border-b pb-6">
                  <span className="text-xl text-gray-500">待缴笔数</span>
                  <span className="text-3xl font-bold">1 笔</span>
                </div>
                <div className="flex justify-between items-center border-b pb-6">
                  <span className="text-xl text-gray-500">总金额</span>
                  <span className="text-5xl font-bold text-orange-500">¥ 152.00</span>
                </div>
                <div className="flex items-start gap-4 bg-orange-50 p-4 rounded-xl">
                  <Info className="text-orange-400 shrink-0 mt-1" size={24} />
                  <div className="text-left">
                    <div className="text-lg font-bold text-orange-800">后续事项：血常规检查</div>
                    <div className="text-sm text-orange-600">缴费成功后请前往门诊楼 2 层检验科</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <button onClick={() => setCurrentId(5)} className="btn-primary py-8 bg-orange-500 border-none">立即缴费</button>
              <div className="grid grid-cols-2 gap-4">
                <button className="btn-secondary border-orange-500 text-orange-500">查看费用明细</button>
                <button className="btn-secondary border-orange-500 text-orange-500">只处理最急的一项</button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="flex flex-col gap-10 w-full text-center">
            <div>
              <h1 className="text-5xl font-bold mb-4">你接下来要去做检查</h1>
              <p className="text-2xl text-gray-500">先确认准备要求和地点</p>
            </div>

            <div className="bg-white p-10 rounded-3xl card-shadow border-t-8 border-hospital-blue">
              <div className="flex flex-col gap-8">
                <div className="flex justify-between items-center border-b pb-6">
                  <span className="text-xl text-gray-500">检查名称</span>
                  <span className="text-3xl font-bold">腹部超声检查</span>
                </div>
                <div className="flex justify-between items-center border-b pb-6">
                  <span className="text-xl text-gray-500">检查地点</span>
                  <span className="text-3xl font-bold">医技楼 2 层 超声科</span>
                </div>
                <div className="flex flex-col gap-4 text-left bg-blue-50 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 text-hospital-blue font-bold text-xl">
                    <AlertCircle size={24} /> 准备要求
                  </div>
                  <ul className="text-lg text-gray-700 list-disc list-inside space-y-2">
                    <li>需空腹（禁食 8 小时以上）</li>
                    <li>检查前请勿大量饮水</li>
                    <li>请携带有效身份证件</li>
                  </ul>
                  <div className="mt-2 flex items-center gap-2 text-red-500 font-bold">
                    <Clock size={20} /> 当前状态：未满足空腹要求？
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <button onClick={() => setCurrentId(7)} className="btn-primary py-8">查看准备要求</button>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setCurrentId(7)} className="btn-secondary">查看地点</button>
                <button className="btn-secondary">打印单据</button>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="flex flex-col gap-10 w-full text-center">
            <div>
              <h1 className="text-5xl font-bold mb-4">你的报告已可以领取</h1>
              <p className="text-2xl text-gray-500">共 2 份报告可打印</p>
            </div>

            <div className="bg-white p-10 rounded-3xl card-shadow border-t-8 border-green-500">
              <div className="flex flex-col gap-6">
                {[
                  { name: "血常规检验报告", time: "2024-03-25 09:30", status: "可打印" },
                  { name: "胸部 X 线检查报告", time: "2024-03-25 10:15", status: "窗口领取" }
                ].map((report, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
                    <div className="text-left">
                      <div className="text-2xl font-bold">{report.name}</div>
                      <div className="text-gray-500">{report.time}</div>
                    </div>
                    <span className={`px-4 py-2 rounded-lg font-bold ${report.status === '可打印' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {report.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <button onClick={() => setCurrentId(9)} className="btn-primary py-8 bg-green-600 border-none">
                <Printer size={32} /> 打印全部可打印报告
              </button>
              <div className="grid grid-cols-2 gap-4">
                <button className="btn-secondary border-green-600 text-green-600">只打印最新一份</button>
                <button onClick={() => setCurrentId(7)} className="btn-secondary border-green-600 text-green-600">查看领取地点</button>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="flex flex-col gap-10 w-full text-center">
            <div>
              <h1 className="text-5xl font-bold mb-4">接下来请前往这里</h1>
              <p className="text-2xl text-gray-500">目的地：门诊楼 3 层 A 区</p>
            </div>

            <div className="bg-white p-6 rounded-3xl card-shadow relative overflow-hidden aspect-video flex items-center justify-center border-2 border-gray-100">
              <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Navigation size={120} className="mx-auto mb-4 opacity-20" />
                  <p className="text-xl">路线图加载中...</p>
                </div>
              </div>
              <div className="relative z-10 bg-white/90 backdrop-blur p-6 rounded-2xl shadow-lg border border-white max-w-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-hospital-blue rounded-full flex items-center justify-center text-white">
                    <MapPin size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">当前位置</div>
                    <div className="text-sm text-gray-500">1层 大厅自助机</div>
                  </div>
                </div>
                <div className="h-12 w-px bg-gray-200 ml-5 my-2"></div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">目的地</div>
                    <div className="text-sm text-gray-500">3层 A区 呼吸内科</div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t flex justify-between text-sm font-bold">
                  <span>预计步行</span>
                  <span className="text-hospital-blue">3 分钟</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <button onClick={() => setCurrentId(9)} className="btn-primary py-8">开始查看路线</button>
              <div className="grid grid-cols-2 gap-4">
                <button className="btn-secondary">打印路线</button>
                <button onClick={() => setCurrentId(1)} className="btn-secondary">返回当前任务</button>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="flex flex-col gap-10 w-full text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                <AlertCircle size={64} />
              </div>
              <div>
                <h1 className="text-5xl font-bold mb-4">这一步我没能直接帮你完成</h1>
                <p className="text-2xl text-gray-500">未查询到你今日的预约记录</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-4">
              <button onClick={() => setCurrentId(3)} className="task-card flex-row items-center p-8 bg-white border-2 border-hospital-blue">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-hospital-blue">
                  <Calendar size={32} />
                </div>
                <div className="text-left flex-1 ml-6">
                  <div className="text-2xl font-bold">重新预约</div>
                  <div className="text-lg text-gray-500">如果你还没挂号，请点这里</div>
                </div>
                <ChevronRight className="text-hospital-blue" />
              </button>

              <button className="task-card flex-row items-center p-8 bg-white">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                  <PhoneCall size={32} />
                </div>
                <div className="text-left flex-1 ml-6">
                  <div className="text-2xl font-bold">转人工窗口</div>
                  <div className="text-lg text-gray-500">前往 1 层 1-5 号人工服务窗口</div>
                </div>
                <ChevronRight className="text-gray-300" />
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-8">
              <button onClick={() => setCurrentId(1)} className="btn-secondary py-6">
                <RotateCcw size={24} /> 重新识别今日事项
              </button>
              <button className="text-xl text-gray-400 font-bold">呼叫帮助</button>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="flex flex-col gap-12 w-full text-center py-10">
            <div className="flex flex-col items-center gap-8">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-40 h-40 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-200"
              >
                <CheckCircle2 size={100} />
              </motion.div>
              <div>
                <h1 className="text-6xl font-bold mb-6">你当前的主要事项已完成</h1>
                <p className="text-2xl text-gray-500">祝你早日康复</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl card-shadow flex flex-col gap-6">
              <div className="text-xl font-bold text-gray-400 uppercase tracking-widest">后续建议</div>
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => setCurrentId(7)} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <MapPin className="text-hospital-blue" />
                    <span className="text-2xl font-bold">查看后续门诊地点</span>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-hospital-blue" />
                </button>
                <button className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <Printer className="text-hospital-blue" />
                    <span className="text-2xl font-bold">打印凭条</span>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-hospital-blue" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6 mt-8">
              <button 
                onClick={() => {
                  setHasIdentity(false);
                  setCurrentId(1);
                }}
                className="btn-primary py-10 text-3xl"
              >
                完成并退出
              </button>
              <div className="flex items-center justify-center gap-4 text-orange-500 font-bold text-xl bg-orange-50 py-4 rounded-2xl">
                <AlertCircle size={24} /> 请记得取走您的卡片和票据
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-hospital-bg overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full h-full flex justify-center"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-20 bg-white border-t flex items-center justify-between px-12 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-gray-500">
            <Clock size={20} />
            <span className="font-mono text-xl">10:15:30</span>
          </div>
          <div className="w-px h-6 bg-gray-200"></div>
          <div className="text-gray-500 text-lg">终端编号: ZD-0822</div>
        </div>
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-hospital-blue font-bold text-xl">
            <PhoneCall size={24} /> 呼叫人工
          </button>
          <div className="w-px h-6 bg-gray-200"></div>
          <button 
            onClick={() => setCurrentId(1)}
            className="text-gray-500 font-bold text-xl flex items-center gap-2"
          >
            <RotateCcw size={24} /> 返回首页
          </button>
        </div>
      </footer>
    </div>
  );
}
