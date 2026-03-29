import React, { useState, useEffect } from 'react';
import { 
  TaskStatusHeader, 
  LocationCard, 
  TimeCard, 
  QueueStatusCard, 
  PaymentSummaryCard, 
  ExamGroupCard, 
  ReportStatusCard, 
  PharmacyCard, 
  ActionButtons, 
  StateBlock 
} from './AtomicComponents';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Mic, ArrowLeft, CheckCircle2, MessageSquare } from 'lucide-react';

// 定义任务步骤的结构
interface TaskStep {
  title: string;
  description: string;
  components: React.ReactNode[];
  primaryAction?: string;
  secondaryAction?: string;
}

interface TaskFlow {
  name: string;
  steps: TaskStep[];
}

export const TasksPage: React.FC = () => {
  const [view, setView] = useState<'input' | 'analyzing' | 'executing'>('input');
  const [inputValue, setInputValue] = useState('');
  const [currentFlow, setCurrentFlow] = useState<TaskFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // 模拟 AI 任务拆解逻辑
  const analyzeIntent = (input: string) => {
    setView('analyzing');
    
    // 模拟分析延迟
    setTimeout(() => {
      let flow: TaskFlow;

      if (input.includes('挂号') || input.includes('医生') || input.includes('看病')) {
        flow = {
          name: '预约挂号流程',
          steps: [
            {
              title: '确认科室与时间',
              description: 'AI 已为您匹配最合适的医生排班',
              components: [
                <LocationCard key="loc" hospital="瑞金医院" department="呼吸内科" room="门诊 302" />,
                <TimeCard key="time" date="2026-03-28" timeSlot="09:00 - 09:30" />
              ],
              primaryAction: '确认预约',
              secondaryAction: '更换时间'
            },
            {
              title: '支付挂号费',
              description: '请完成支付以锁定名额',
              components: [
                <PaymentSummaryCard key="pay" items={[{ name: '专家挂号费', price: 50 }]} total={50} />
              ],
              primaryAction: '立即支付 ¥50',
            }
          ]
        };
      } else if (input.includes('取药') || input.includes('药')) {
        flow = {
          name: '取药指引流程',
          steps: [
            {
              title: '确认药品信息',
              description: '您的药品已配好，请核对',
              components: [
                <PharmacyCard key="pharm" window="3号窗口" code="8842" medicines={['阿莫西林', '止咳糖浆']} />,
                <LocationCard key="loc" hospital="瑞金医院" department="门诊药房" room="1楼大厅" />
              ],
              primaryAction: '我已到达窗口',
            }
          ]
        };
      } else if (input.includes('候诊') || input.includes('签到') || input.includes('排队')) {
        flow = {
          name: '签到候诊流程',
          steps: [
            {
              title: '签到成功',
              description: '您已进入排队序列，请在候诊区等待',
              components: [
                <QueueStatusCard key="queue" currentNumber="A042" waitingCount={5} estimatedTime="15分钟" />,
                <LocationCard key="loc" hospital="瑞金医院" department="呼吸内科" room="候诊区 A" />
              ],
              primaryAction: '刷新进度',
              secondaryAction: '查看病历'
            }
          ]
        };
      } else {
        // 默认兜底
        flow = {
          name: '通用咨询服务',
          steps: [
            {
              title: '为您找到相关信息',
              description: '根据您的描述，为您推荐以下操作',
              components: [
                <StateBlock key="state" type="empty" message="未找到匹配的特定流程，您可以尝试描述更具体一些，如“我要挂号”" />
              ],
              primaryAction: '返回重试'
            }
          ]
        };
      }

      setCurrentFlow(flow);
      setCurrentStepIndex(0);
      setView('executing');
    }, 2000);
  };

  const handleNextStep = () => {
    if (currentFlow && currentStepIndex < currentFlow.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // 任务结束，回到初始页面
      resetToStart();
    }
  };

  const resetToStart = () => {
    setView('input');
    setInputValue('');
    setCurrentFlow(null);
    setCurrentStepIndex(0);
  };

  const currentStep = currentFlow?.steps[currentStepIndex];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex flex-col">
      <AnimatePresence mode="wait">
        {view === 'input' && (
          <motion.div 
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full"
          >
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-200 mb-8">
              <MessageSquare size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">您好，我是就医助手</h2>
            <p className="text-gray-500 text-center mb-12 font-medium">您可以告诉我您的需求，例如“我要挂号”、“哪里取药”或“查看报告”</p>
            
            <div className="w-full relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white rounded-2xl shadow-xl flex items-center p-2 border border-gray-100">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && inputValue && analyzeIntent(inputValue)}
                  placeholder="输入您的需求..."
                  className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-lg font-medium placeholder:text-gray-300"
                />
                <button 
                  onClick={() => inputValue && analyzeIntent(inputValue)}
                  className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-90 transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3 w-full">
              {['我要挂号', '哪里取药', '查看排队', '报告出了吗'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => { setInputValue(tag); analyzeIntent(tag); }}
                  className="px-4 py-3 bg-white rounded-xl border border-gray-100 text-sm font-bold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all text-left flex items-center justify-between group"
                >
                  {tag}
                  <Sparkles size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'analyzing' && (
          <motion.div 
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-blue-600 animate-pulse" />
              </div>
            </div>
            <h3 className="mt-8 text-xl font-black text-gray-900">正在为您拆解任务...</h3>
            <p className="mt-2 text-gray-500 font-medium">AI 正在根据您的需求生成最佳路径</p>
          </motion.div>
        )}

        {view === 'executing' && currentFlow && currentStep && (
          <motion.div 
            key="executing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col max-w-md mx-auto w-full"
          >
            {/* 任务进度条 */}
            <div className="px-6 pt-6 flex gap-1.5">
              {currentFlow.steps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${idx <= currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
              ))}
            </div>

            <div className="p-6 flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={resetToStart}
                  className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">
                  Step {currentStepIndex + 1} / {currentFlow.steps.length}
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-900">{currentStep.title}</h2>
                <p className="text-gray-500 font-medium">{currentStep.description}</p>
              </div>

              <motion.div 
                key={currentStepIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {currentStep.components}
              </motion.div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 sticky bottom-0">
              <ActionButtons 
                primaryLabel={currentStep.primaryAction || (currentStepIndex === currentFlow.steps.length - 1 ? '完成任务' : '下一步')}
                secondaryLabel={currentStep.secondaryAction}
                onPrimary={handleNextStep}
                onSecondary={() => currentStepIndex > 0 && setCurrentStepIndex(prev => prev - 1)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部装饰 */}
      {view === 'input' && (
        <footer className="p-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI Inquiry Desk Online</span>
          </div>
        </footer>
      )}
    </div>
  );
};
