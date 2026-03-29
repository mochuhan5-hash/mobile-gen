import AIMessageRenderer from '../components/ai/AIMessageRenderer';
import AITaskCompletionCard from '../components/ai/AITaskCompletionCard';
import AITaskRenderer from '../components/ai/AITaskRenderer';
import { messageCardSamples, taskCompletionSamples, taskPanelSamples } from '../data/aiComponentLibrarySamples';

export default function AIComponentLibraryPage() {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 py-2 sm:gap-8 sm:py-4">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:mb-3 sm:text-4xl">AI 组件库</h1>
        <p className="text-sm text-gray-500 sm:text-base">集中预览当前 AI 会使用的消息组件与任务组件。</p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">消息组件</h2>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">用于聊天消息中的 AI 回复卡片。</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          {messageCardSamples.map((sample) => (
            <div key={sample.title} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4 sm:items-center sm:gap-4">
                <div className="text-lg font-bold text-gray-900 sm:text-xl">{sample.title}</div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500 sm:px-3 sm:text-sm">{sample.component.type}</span>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3 sm:p-4">
                <AIMessageRenderer component={sample.component} preview />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">任务完成态组件</h2>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">用于每个任务完成后的统一完成标志页。</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:gap-6">
          {taskCompletionSamples.map((sample) => (
            <div key={sample.title} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4 sm:items-center sm:gap-4">
                <div className="text-lg font-bold text-gray-900 sm:text-xl">{sample.title}</div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500 sm:px-3 sm:text-sm">completion</span>
              </div>
              <AITaskCompletionCard summary={sample.summary} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 pb-4 sm:pb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">任务组件</h2>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">用于 AI 引导后的全屏任务面板。</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:gap-6">
          {taskPanelSamples.map((sample) => (
            <div key={sample.title} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4 sm:items-center sm:gap-4">
                <div className="text-lg font-bold text-gray-900 sm:text-xl">{sample.title}</div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500 sm:px-3 sm:text-sm">{sample.task.type}</span>
              </div>
              <div className="min-h-[320px] sm:min-h-[380px]">
                <AITaskRenderer
                  activeTask={sample.task}
                  taskStep={sample.taskStep ?? 0}
                  setTaskStep={() => undefined}
                  setActiveTask={() => undefined}
                  preview
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
