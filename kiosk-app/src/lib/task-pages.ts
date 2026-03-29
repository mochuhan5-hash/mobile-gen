export type TaskSlug =
  | "check-in"
  | "payment"
  | "confirm-medicines"
  | "medicine-payment"
  | "print-report"
  | "queue-waiting"
  | "human-assist";

export type TaskPageConfig = {
  slug: TaskSlug;
  title: string;
  shortDescription: string;
  sceneHint: string;
  steps: string[];
  related: TaskSlug[];
};

/**
 * 一任务一页面：任务元数据中心。
 */
export const TASK_PAGE_CONFIGS: TaskPageConfig[] = [
  {
    slug: "check-in",
    title: "签到",
    shortDescription: "适用于已挂号待就诊用户",
    sceneHint: "有预约且未签到时，优先处理签到",
    steps: ["点击“签到”", "完成插卡/扫码身份核验", "确认科室与时间", "进入候诊并留意叫号"],
    related: ["queue-waiting", "human-assist", "payment"],
  },
  {
    slug: "payment",
    title: "缴费",
    shortDescription: "适用于存在未缴费订单用户",
    sceneHint: "收费区机器场景下，缴费优先级更高",
    steps: ["点击“缴费”", "核对待缴清单", "选择支付方式并支付", "保存票据或返回主页"],
    related: ["print-report", "human-assist", "check-in"],
  },
  {
    slug: "confirm-medicines",
    title: "确认药品清单",
    shortDescription: "复诊挂号后确认本次处方药清单",
    sceneHint: "请先核对药品名称、规格和数量，再进入缴费",
    steps: ["查看药品清单", "核对药品数量与用法", "确认进入药品缴费"],
    related: ["medicine-payment", "human-assist", "queue-waiting"],
  },
  {
    slug: "medicine-payment",
    title: "药品缴费",
    shortDescription: "按药品清单完成缴费",
    sceneHint: "药品缴费后可进入取药流程",
    steps: ["核对药品费用", "确认支付", "支付完成"],
    related: ["human-assist", "print-report", "check-in"],
  },
  {
    slug: "print-report",
    title: "打印报告",
    shortDescription: "适用于检验/检查结果已出用户",
    sceneHint: "检验区附近机器通常优先推荐打印报告",
    steps: ["点击“报告打印”", "完成身份核验", "选择报告并确认打印", "从打印口取走报告"],
    related: ["payment", "human-assist", "check-in"],
  },
  {
    slug: "queue-waiting",
    title: "候诊排队",
    shortDescription: "适用于已签到或正在排队用户",
    sceneHint: "刚完成签到后，通常进入候诊流程",
    steps: ["确认已签到状态", "查看当前叫号序号", "在候诊区等待", "叫号后按提示前往诊室"],
    related: ["check-in", "payment", "human-assist"],
  },
  {
    slug: "human-assist",
    title: "人工协助",
    shortDescription: "适用于多次取消、反复跳转、停留过久用户",
    sceneHint: "系统识别高困惑度时建议人工介入",
    steps: ["点击“人工协助”入口", "显示人工服务窗口位置", "携带凭证前往窗口", "由工作人员继续办理"],
    related: ["check-in", "payment", "queue-waiting"],
  },
];

/**
 * 通过 slug 查找任务配置。
 */
export function getTaskConfigBySlug(slug: string): TaskPageConfig | null {
  return TASK_PAGE_CONFIGS.find((item) => item.slug === slug) ?? null;
}

