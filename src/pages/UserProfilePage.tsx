import { Plus, User, HeartPulse, FileText } from 'lucide-react';
import type { UserProfile, VisitRecord } from '../types';

interface UserProfilePageProps {
  profile: UserProfile;
  onBasicInfoChange: (field: keyof UserProfile['basicInfo'], value: string) => void;
  onHealthProfileChange: (field: keyof UserProfile['healthProfile'], value: string) => void;
  onVisitRecordChange: (id: string, field: keyof VisitRecord, value: string) => void;
  onAddVisitRecord: () => void;
}

export default function UserProfilePage({
  profile,
  onBasicInfoChange,
  onHealthProfileChange,
  onVisitRecordChange,
  onAddVisitRecord,
}: UserProfilePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 sm:gap-8 sm:py-4">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:mb-3 sm:text-4xl">用户档案</h1>
        <p className="text-sm text-gray-500 sm:text-base">维护用户长期就诊背景，供 AI 每次引导时参考。</p>
      </div>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-hospital-blue">
            <User size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">基础信息</h2>
            <p className="text-sm text-gray-500">这些信息会影响 AI 的分诊和引导语气。</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-gray-600">姓名</span>
            <input value={profile.basicInfo.name} onChange={(e) => onBasicInfoChange('name', e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-gray-600">年龄</span>
            <input value={String(profile.basicInfo.age)} onChange={(e) => onBasicInfoChange('age', e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-gray-600">性别</span>
            <input value={profile.basicInfo.gender} onChange={(e) => onBasicInfoChange('gender', e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-gray-600">手机号</span>
            <input value={profile.basicInfo.phone} onChange={(e) => onBasicInfoChange('phone', e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
            <HeartPulse size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">健康背景</h2>
            <p className="text-sm text-gray-500">记录过敏史、慢病和长期备注。</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-bold text-gray-600">过敏史</span>
            <textarea value={profile.healthProfile.allergies} onChange={(e) => onHealthProfileChange('allergies', e.target.value)} className="min-h-[96px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-gray-600">慢病史</span>
            <textarea value={profile.healthProfile.chronicConditions} onChange={(e) => onHealthProfileChange('chronicConditions', e.target.value)} className="min-h-[96px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-gray-600">备注</span>
            <textarea value={profile.healthProfile.notes} onChange={(e) => onHealthProfileChange('notes', e.target.value)} className="min-h-[96px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">既往就诊记录</h2>
              <p className="text-sm text-gray-500">这些记录会作为 AI 每次生成引导的历史参考。</p>
            </div>
          </div>
          <button onClick={onAddVisitRecord} className="flex items-center gap-2 rounded-2xl bg-hospital-blue px-4 py-3 text-sm font-bold text-white shadow-sm">
            <Plus size={16} /> 新增记录
          </button>
        </div>

        <div className="space-y-4">
          {profile.visitRecords.map((record) => (
            <div key={record.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-gray-600">日期</span>
                  <input value={record.date} onChange={(e) => onVisitRecordChange(record.id, 'date', e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-gray-600">科室</span>
                  <input value={record.department} onChange={(e) => onVisitRecordChange(record.id, 'department', e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-bold text-gray-600">主诉</span>
                  <input value={record.complaint} onChange={(e) => onVisitRecordChange(record.id, 'complaint', e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-bold text-gray-600">诊断</span>
                  <input value={record.diagnosis} onChange={(e) => onVisitRecordChange(record.id, 'diagnosis', e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-bold text-gray-600">处理结果</span>
                  <textarea value={record.treatment} onChange={(e) => onVisitRecordChange(record.id, 'treatment', e.target.value)} className="min-h-[96px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-hospital-blue" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
