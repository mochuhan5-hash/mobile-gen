import React from 'react';
import { 
  MapPin, 
  Clock, 
  Users, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  Calendar,
  Stethoscope,
  Pill
} from 'lucide-react';
import { motion } from 'motion/react';

// 1. 任务状态头 (TaskStatusHeader)
export const TaskStatusHeader: React.FC<{
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description?: string;
}> = ({ title, status, description }) => {
  const statusConfig = {
    pending: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
    processing: { color: 'text-orange-600', bg: 'bg-orange-50', icon: Loader2 },
    completed: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
    failed: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-xl ${config.bg} border border-transparent`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full bg-white shadow-sm ${config.color}`}>
          <Icon size={20} className={status === 'processing' ? 'animate-spin' : ''} />
        </div>
        <div>
          <h2 className="font-bold text-lg text-gray-900">{title}</h2>
          {description && <p className="text-sm text-gray-600 mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
  );
};

// 2. 医院/科室/地点信息卡 (LocationCard)
export const LocationCard: React.FC<{
  hospital: string;
  department: string;
  address?: string;
  room?: string;
}> = ({ hospital, department, address, room }) => (
  <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
        <MapPin size={18} />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-gray-900">{hospital}</div>
        <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
          <Stethoscope size={14} />
          {department} {room && <span className="text-gray-400">| {room}</span>}
        </div>
        {address && (
          <div className="text-xs text-gray-400 mt-2 italic">
            {address}
          </div>
        )}
      </div>
    </div>
  </div>
);

// 3. 时间/预约卡 (TimeCard)
export const TimeCard: React.FC<{
  date: string;
  timeSlot: string;
  type?: 'appointment' | 'deadline';
}> = ({ date, timeSlot, type = 'appointment' }) => (
  <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
        <Calendar size={18} />
      </div>
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          {type === 'appointment' ? '预约时间' : '截止时间'}
        </div>
        <div className="font-bold text-gray-900">{date}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-lg font-mono font-bold text-purple-600">{timeSlot}</div>
    </div>
  </div>
);

// 4. 候诊/排队状态卡 (QueueStatusCard)
export const QueueStatusCard: React.FC<{
  currentNumber: string;
  waitingCount: number;
  estimatedTime?: string;
}> = ({ currentNumber, waitingCount, estimatedTime }) => (
  <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl text-white shadow-lg">
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="text-blue-100 text-sm font-medium">当前叫号</div>
        <div className="text-3xl font-black tracking-tighter mt-1">{currentNumber}</div>
      </div>
      <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
        <Users size={20} />
      </div>
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-white/10">
      <div className="text-sm">
        前面还有 <span className="font-bold text-lg mx-1">{waitingCount}</span> 人
      </div>
      {estimatedTime && (
        <div className="text-xs bg-white/20 px-2 py-1 rounded-full">
          预计等待 {estimatedTime}
        </div>
      )}
    </div>
  </div>
);

// 5. 缴费摘要卡 (PaymentSummaryCard)
export const PaymentSummaryCard: React.FC<{
  items: { name: string; price: number }[];
  total: number;
  status?: 'unpaid' | 'paid';
}> = ({ items, total, status = 'unpaid' }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
      <div className="flex items-center gap-2 font-semibold text-gray-700">
        <CreditCard size={16} />
        费用明细
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
        {status === 'paid' ? '已支付' : '待支付'}
      </span>
    </div>
    <div className="p-4 space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex justify-between text-sm">
          <span className="text-gray-600">{item.name}</span>
          <span className="font-mono text-gray-900">¥{item.price.toFixed(2)}</span>
        </div>
      ))}
      <div className="pt-3 mt-2 border-t border-dashed border-gray-200 flex justify-between items-baseline">
        <span className="font-bold text-gray-900">合计</span>
        <span className="text-2xl font-black text-red-600 font-mono">¥{total.toFixed(2)}</span>
      </div>
    </div>
  </div>
);

// 6. 检查项分组卡 (ExamGroupCard)
export const ExamGroupCard: React.FC<{
  title: string;
  exams: { name: string; status: 'pending' | 'completed' }[];
}> = ({ title, exams }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 flex items-center gap-2">
      <div className="w-1 h-4 bg-blue-600 rounded-full" />
      {title}
    </div>
    <div className="divide-y divide-gray-50">
      {exams.map((exam, idx) => (
        <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span className="text-gray-700 font-medium">{exam.name}</span>
          <div className="flex items-center gap-2">
            {exam.status === 'completed' ? (
              <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                <CheckCircle2 size={14} /> 已完成
              </span>
            ) : (
              <span className="text-xs text-orange-500 font-medium">待检查</span>
            )}
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 7. 报告状态卡 (ReportStatusCard)
export const ReportStatusCard: React.FC<{
  title: string;
  date: string;
  status: 'ready' | 'processing';
  id?: string;
}> = ({ title, date, status, id }) => (
  <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${status === 'ready' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
      <FileText size={24} />
    </div>
    <div className="flex-1">
      <h3 className="font-bold text-gray-900">{title}</h3>
      <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
        <span>{date}</span>
        {id && <span>ID: {id}</span>}
      </div>
    </div>
    <div>
      {status === 'ready' ? (
        <button className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-green-700 active:scale-95 transition-all">
          查看报告
        </button>
      ) : (
        <div className="text-xs text-blue-600 font-bold flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> 生成中
        </div>
      )}
    </div>
  </div>
);

// 8. 取药信息卡 (PharmacyCard)
export const PharmacyCard: React.FC<{
  window: string;
  code: string;
  medicines: string[];
}> = ({ window, code, medicines }) => (
  <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
    <div className="flex items-center gap-2 text-emerald-700 font-bold mb-4">
      <Pill size={18} />
      取药指引
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="bg-white p-3 rounded-xl shadow-sm">
        <div className="text-[10px] text-gray-400 uppercase font-bold">取药窗口</div>
        <div className="text-xl font-black text-emerald-600">{window}</div>
      </div>
      <div className="bg-white p-3 rounded-xl shadow-sm">
        <div className="text-[10px] text-gray-400 uppercase font-bold">取药凭证码</div>
        <div className="text-xl font-black text-emerald-600 font-mono">{code}</div>
      </div>
    </div>
    <div className="space-y-1">
      <div className="text-xs text-emerald-600 font-bold mb-1">药品清单</div>
      {medicines.map((m, i) => (
        <div key={i} className="text-sm text-gray-700 flex items-center gap-2">
          <div className="w-1 h-1 bg-emerald-400 rounded-full" />
          {m}
        </div>
      ))}
    </div>
  </div>
);

// 9. 操作按钮区 (ActionButtons)
export const ActionButtons: React.FC<{
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  disabled?: boolean;
}> = ({ primaryLabel, secondaryLabel, onPrimary, onSecondary, disabled }) => (
  <div className="flex gap-3 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 sticky bottom-0 left-0 right-0">
    {secondaryLabel && (
      <button 
        onClick={onSecondary}
        disabled={disabled}
        className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
      >
        {secondaryLabel}
      </button>
    )}
    {primaryLabel && (
      <button 
        onClick={onPrimary}
        disabled={disabled}
        className="flex-[2] py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
      >
        {primaryLabel}
      </button>
    )}
  </div>
);

// 10. 空/加载/不可用状态块 (StateBlocks)
export const StateBlock: React.FC<{
  type: 'empty' | 'loading' | 'error';
  message?: string;
}> = ({ type, message }) => {
  const configs = {
    empty: { icon: FileText, color: 'text-gray-300', defaultMsg: '暂无相关数据' },
    loading: { icon: Loader2, color: 'text-blue-400', defaultMsg: '正在努力加载中...' },
    error: { icon: AlertCircle, color: 'text-red-400', defaultMsg: '服务暂时不可用' },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`mb-4 ${config.color}`}
      >
        <Icon size={48} className={type === 'loading' ? 'animate-spin' : ''} strokeWidth={1.5} />
      </motion.div>
      <p className="text-gray-500 font-medium">{message || config.defaultMsg}</p>
      {type === 'error' && (
        <button className="mt-4 text-sm text-blue-600 font-bold underline underline-offset-4">
          重试一下
        </button>
      )}
    </div>
  );
};
