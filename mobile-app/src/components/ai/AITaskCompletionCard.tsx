import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, ChevronRight, MapPin, Printer } from 'lucide-react';
import type { TaskCompletionSummary } from '../../types';

interface AITaskCompletionCardProps {
  summary: TaskCompletionSummary;
  onPrimaryAction?: () => void;
  onFollowUp?: (targetId?: number) => void;
}

export default function AITaskCompletionCard({
  summary,
  onPrimaryAction,
  onFollowUp,
}: AITaskCompletionCardProps) {
  return (
    <div className="flex w-full flex-col gap-8 py-6 text-center sm:gap-10 sm:py-8">
      <div className="flex flex-col items-center gap-5 sm:gap-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl shadow-green-200 sm:h-36 sm:w-36"
        >
          <CheckCircle2 size={64} />
        </motion.div>
        <div>
          <h1 className="mb-3 text-3xl font-bold sm:text-5xl">{summary.title}</h1>
          <p className="text-base text-gray-500 sm:text-lg">{summary.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 card-shadow sm:gap-5 sm:p-6">
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400 sm:text-base">后续建议</div>
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {summary.followUps.map((item) => (
            <button
              key={item.label}
              onClick={() => onFollowUp?.(item.targetId)}
              className="group flex items-center justify-between rounded-2xl bg-gray-50 p-4 transition-colors hover:bg-blue-50 sm:p-5"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {item.icon === 'location' ? <MapPin className="text-hospital-blue" size={20} /> : <Printer className="text-hospital-blue" size={20} />}
                <span className="text-base font-bold sm:text-lg">{item.label}</span>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-hospital-blue" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-4 sm:gap-5">
        <button onClick={onPrimaryAction} className="btn-primary text-lg sm:text-xl">
          {summary.primaryActionLabel}
        </button>
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-500 sm:gap-3 sm:text-base">
          <AlertCircle size={18} /> {summary.notice}
        </div>
      </div>
    </div>
  );
}
