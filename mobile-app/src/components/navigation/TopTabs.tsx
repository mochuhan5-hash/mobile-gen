import type { AppView } from '../../types';

interface TopTabsProps {
  activeView: AppView;
  onChange: (view: AppView) => void;
}

const tabs: Array<{ value: AppView; label: string }> = [
  { value: 'business', label: '业务演示' },
  { value: 'library', label: 'AI 组件库' },
  { value: 'profile', label: '用户档案' },
];

export default function TopTabs({ activeView, onChange }: TopTabsProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-3 pt-3 sm:px-4 sm:pt-4 shrink-0">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 rounded-2xl bg-gray-100 p-1">
        {tabs.map((tab) => {
          const active = tab.value === activeView;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all sm:px-4 sm:py-3 sm:text-base ${
                active
                  ? 'bg-hospital-blue text-white shadow-sm'
                  : 'text-gray-500 hover:bg-white/80'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
