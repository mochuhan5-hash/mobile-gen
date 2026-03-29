import React from 'react';
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

export const GalleryPage: React.FC = () => {
  return (
    <div className="pb-20">
      <header className="bg-white border-b border-gray-100 px-6 py-8 shadow-sm">
        <h1 className="text-3xl font-black tracking-tight text-blue-600">Medical UI Kit</h1>
        <p className="text-gray-500 mt-2 font-medium">原子组件库展示 - 任务导向、界面简洁、通用</p>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-12">
        
        {/* 1. 任务状态头 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">1. 任务状态头 (TaskStatusHeader)</h2>
          <div className="grid gap-4">
            <TaskStatusHeader title="预约挂号" status="pending" description="请确认您的预约信息并完成支付" />
            <TaskStatusHeader title="正在候诊" status="processing" description="您已成功签到，请在候诊区耐心等待" />
            <TaskStatusHeader title="诊后缴费" status="completed" description="费用已支付成功，感谢您的配合" />
            <TaskStatusHeader title="支付失败" status="failed" description="由于网络原因支付未成功，请重试" />
          </div>
        </section>

        {/* 2. 医院/科室/地点信息卡 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">2. 医院/科室/地点信息卡 (LocationCard)</h2>
          <div className="grid gap-4">
            <LocationCard 
              hospital="上海交通大学医学院附属瑞金医院" 
              department="呼吸内科" 
              room="门诊大楼 3楼 302室"
              address="上海市黄浦区瑞金二路197号"
            />
            <LocationCard 
              hospital="复旦大学附属华山医院" 
              department="神经内科" 
              room="1号楼 5楼 508诊室"
            />
          </div>
        </section>

        {/* 3. 时间/预约卡 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">3. 时间/预约卡 (TimeCard)</h2>
          <div className="grid gap-4">
            <TimeCard date="2026年3月28日 (周六)" timeSlot="09:00 - 09:30" />
            <TimeCard date="2026年3月30日 (周一)" timeSlot="14:00 截止" type="deadline" />
          </div>
        </section>

        {/* 4. 候诊/排队状态卡 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">4. 候诊/排队状态卡 (QueueStatusCard)</h2>
          <div className="grid gap-4">
            <QueueStatusCard 
              currentNumber="A042" 
              waitingCount={5} 
              estimatedTime="约15分钟" 
            />
          </div>
        </section>

        {/* 5. 缴费摘要卡 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">5. 缴费摘要卡 (PaymentSummaryCard)</h2>
          <div className="grid gap-4">
            <PaymentSummaryCard 
              items={[
                { name: '血常规 (五分类)', price: 45.00 },
                { name: '胸部正侧位 X线', price: 120.00 },
                { name: '阿莫西林胶囊 x2', price: 32.50 },
              ]} 
              total={197.50} 
              status="unpaid"
            />
          </div>
        </section>

        {/* 6. 检查项分组卡 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">6. 检查项分组卡 (ExamGroupCard)</h2>
          <div className="grid gap-4">
            <ExamGroupCard 
              title="检验科 (2楼)" 
              exams={[
                { name: '血常规 (五分类)', status: 'completed' },
                { name: '尿常规', status: 'pending' },
              ]} 
            />
          </div>
        </section>

        {/* 7. 报告状态卡 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">7. 报告状态卡 (ReportStatusCard)</h2>
          <div className="grid gap-4">
            <ReportStatusCard 
              title="血常规 (五分类) 报告单" 
              date="2026-03-26 10:15" 
              status="ready" 
              id="RPT-20260326-001"
            />
            <ReportStatusCard 
              title="胸部正侧位 X线 影像报告" 
              date="预计 2026-03-26 14:00" 
              status="processing" 
            />
          </div>
        </section>

        {/* 8. 取药信息卡 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">8. 取药信息卡 (PharmacyCard)</h2>
          <div className="grid gap-4">
            <PharmacyCard 
              window="3号 门诊药房" 
              code="8842" 
              medicines={['阿莫西林胶囊 (0.25g*24粒)', '复方甘草口服溶液 (100ml)']} 
            />
          </div>
        </section>

        {/* 9. 操作按钮区 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">9. 操作按钮区 (ActionButtons)</h2>
          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-400 mb-4 italic">* 按钮区通常吸附在屏幕底部，此处为静态展示</p>
            <div className="relative border border-gray-100 rounded-lg overflow-hidden">
              <ActionButtons 
                primaryLabel="立即支付" 
                secondaryLabel="取消预约" 
              />
            </div>
          </div>
        </section>

        {/* 10. 空/加载/不可用状态块 */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">10. 空/加载/不可用状态块 (StateBlock)</h2>
          <div className="grid gap-4 bg-white rounded-xl border border-gray-100">
            <StateBlock type="loading" />
            <div className="border-t border-gray-50">
              <StateBlock type="empty" message="暂无就医记录" />
            </div>
            <div className="border-t border-gray-50">
              <StateBlock type="error" message="网络连接似乎断开了" />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};
