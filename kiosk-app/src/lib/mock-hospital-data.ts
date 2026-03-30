import type { FlowEvidence } from "./flow-engine";
import type { AppLang } from "./i18n-shared";

export type Recommendation = {
  department: string;
  reason: string;
  doctorHint: string;
  queueHint: string;
};

export type PriorityMode = "time-first" | "expert-first";

export type DoctorCandidate = {
  name: string;
  title: string;
  nextSlot: string;
  waitMinutes: number;
  authorityScore: number;
  distanceMeters: number;
  specialty: string;
  years: number;
  consultationFee: number;
};

export type MockJourneyData = {
  symptomInput: string;
  patient: {
    maskedName: string;
    age: number;
    gender: "男" | "女";
    cardType: "医保电子码" | "医保实体卡";
    visitNo: string;
  };
  hospital: {
    name: string;
    campus: string;
  };
  recommendation: Recommendation;
  doctorCandidates: DoctorCandidate[];
  appointment: {
    date: string;
    timeSlot: string;
    department: string;
    room: string;
    doctor: string;
  };
  queue: {
    currentNumber: string;
    waitingCount: number;
    estimatedTime: string;
  };
  payments: {
    items: { name: string; price: number }[];
    total: number;
  };
  report: {
    title: string;
    date: string;
    id: string;
  };
  examPlan: {
    items: {
      name: string;
      location: string;
      prep: string;
      needFasting: boolean;
      queueMinutes: number;
      distanceMeters: number;
      order: number;
    }[];
    groups: { title: string; exams: { name: string; status: "pending" | "completed" }[] }[];
    planningReason: string;
  };
  medicinePlan: {
    items: { name: string; spec: string; qty: number; price: number }[];
    total: number;
  };
  assist: {
    window: string;
    code: string;
    checklist: string[];
  };
};

const HOSPITAL_NAME_ZH = "上海新华医院";
const HOSPITAL_NAME_EN = "Shanghai Xinhua Hospital";

const DOCTOR_NAMES = [
  "李海峰",
  "周宁",
  "王晨",
  "陈静",
  "赵志强",
  "胡蓉",
  "顾晨",
  "邵敏",
  "陈立",
  "袁杰",
  "林佳",
  "徐宁",
  "高远",
  "张洁",
  "宋杰",
];

const TITLE_POOL: Array<DoctorCandidate["title"]> = ["主任医师", "副主任医师", "主治医师"];

/**
 * 把字符串稳定映射为 32 位种子。
 */
function hashToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 基于种子的伪随机数生成器（0~1）。
 */
function createSeededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 使用指定随机源生成区间随机整数。
 */
function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * 使用指定随机源从数组取元素。
 */
function pickOne<T>(arr: T[], rng: () => number): T {
  return arr[randInt(0, arr.length - 1, rng)];
}

/**
 * 按科室随机生成 3 位可推荐医生（用于模拟 AI 动态分配）。
 */
function generateDoctorsByDepartment(department: string): DoctorCandidate[] {
  const rng = createSeededRng(hashToSeed(`doctor:${department}`));
  const specialtyMap: Record<string, string[]> = {
    神经内科: ["头痛、眩晕", "脑血管病", "睡眠障碍"],
    心血管内科: ["高血压", "冠心病", "心律失常"],
    消化内科: ["胃肠功能病", "肝胆胰疾病", "腹痛腹泻"],
    耳鼻咽喉科: ["鼻炎鼻窦炎", "咽喉炎", "眩晕耳鸣"],
    眼科: ["屈光与视疲劳", "眼底病", "角膜结膜病"],
    皮肤科: ["湿疹荨麻疹", "真菌感染", "痤疮皮炎"],
    骨科: ["颈肩腰腿痛", "关节损伤", "运动损伤"],
    泌尿外科: ["尿路感染", "前列腺疾病", "泌尿结石"],
    妇科: ["月经异常", "盆腔炎", "妇科内分泌"],
    儿科: ["小儿呼吸道", "小儿消化", "小儿发热"],
    发热门诊: ["发热分诊", "呼吸道感染", "传染病筛查"],
    急诊医学科: ["急危重救治", "创伤急救", "中毒救治"],
    精神心理科: ["抑郁焦虑评估", "危机干预", "情绪障碍管理"],
    全科医学科: ["常见病筛查", "多系统评估", "慢病管理"],
  };

  const specialties = specialtyMap[department] ?? specialtyMap["全科医学科"];
  const usedNames = new Set<string>();
  const list: DoctorCandidate[] = [];

  for (let i = 0; i < 3; i += 1) {
    let name = pickOne(DOCTOR_NAMES, rng);
    while (usedNames.has(name)) {
      name = pickOne(DOCTOR_NAMES, rng);
    }
    usedNames.add(name);

    const title = TITLE_POOL[i] ?? pickOne(TITLE_POOL, rng);
    const authorityBase = title === "主任医师" ? 92 : title === "副主任医师" ? 84 : 74;
    const feeBase = title === "主任医师" ? 80 : title === "副主任医师" ? 50 : 30;

    list.push({
      name,
      title,
      specialty: pickOne(specialties, rng),
      years: title === "主任医师" ? randInt(18, 30, rng) : title === "副主任医师" ? randInt(12, 20, rng) : randInt(6, 12, rng),
      nextSlot: `10:${String(randInt(5, 45, rng)).padStart(2, "0")}`,
      waitMinutes: randInt(10, 35, rng),
      authorityScore: authorityBase + randInt(-3, 4, rng),
      distanceMeters: randInt(120, 320, rng),
      consultationFee: feeBase,
    });
  }

  return list;
}

type MockBuildOptions = {
  paymentMode?: "full" | "registration-only";
  selectedDoctorName?: string;
  forcedRecommendation?: Recommendation;
  aiRecommendation?: Recommendation;
  aiDoctors?: DoctorCandidate[];
  aiExamItems?: Array<{
    name: string;
    location: string;
    prep: string;
    needFasting: boolean;
    queueMinutes: number;
    distanceMeters: number;
  }>;
  aiMedicineItems?: Array<{ name: string; spec: string; qty: number; price: number }>;
  patientProfile?: {
    name?: string;
    age?: number;
    gender?: "男" | "女";
  };
  lang?: AppLang;
};

/**
 * 判断文本是否包含中文字符。
 */
function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * 中英文本替换（按顺序）。
 */
function replaceAllByMap(text: string, pairs: Array<[string, string]>): string {
  return pairs.reduce((acc, [from, to]) => acc.split(from).join(to), text);
}

/**
 * 将中文自由文本尽量替换为英文；无法覆盖时返回兜底英文。
 */
function zhToEnText(text: string, fallback: string): string {
  const converted = replaceAllByMap(text, [
    ["建议", "Recommended"],
    ["优先", "prioritize"],
    ["立即", "immediately"],
    ["急诊", "Emergency"],
    ["评估", "evaluation"],
    ["普通门诊", "general outpatient"],
    ["分诊", "triage"],
    ["预计候诊", "Estimated wait"],
    ["分钟", "min"],
    ["按分级优先处理", "priority by triage level"],
    ["挂号费", "Registration fee"],
    ["空腹", "fasting"],
    ["请核对", "Please review"],
    ["正在", "Processing"],
    ["完成", "completed"],
  ]).trim();
  if (!hasChinese(converted)) return converted;
  return fallback;
}

function deptToEn(name: string): string {
  const map: Record<string, string> = {
    神经内科: "Neurology",
    心血管内科: "Cardiology",
    消化内科: "Gastroenterology",
    耳鼻咽喉科: "ENT",
    眼科: "Ophthalmology",
    皮肤科: "Dermatology",
    骨科: "Orthopedics",
    泌尿外科: "Urology",
    妇科: "Gynecology",
    儿科: "Pediatrics",
    发热门诊: "Fever Clinic",
    急诊医学科: "Emergency Medicine",
    精神心理科: "Mental Health Clinic",
    全科医学科: "General Practice",
  };
  return map[name] ?? name;
}

function deptToZh(name: string): string {
  const map: Record<string, string> = {
    Neurology: "神经内科",
    Cardiology: "心血管内科",
    Gastroenterology: "消化内科",
    ENT: "耳鼻咽喉科",
    Ophthalmology: "眼科",
    Dermatology: "皮肤科",
    Orthopedics: "骨科",
    Urology: "泌尿外科",
    Gynecology: "妇科",
    Pediatrics: "儿科",
    "Fever Clinic": "发热门诊",
    "Emergency Medicine": "急诊医学科",
    "Mental Health Clinic": "精神心理科",
    "General Practice": "全科医学科",
  };
  return map[name] ?? name;
}

function titleToEn(title: string): string {
  const map: Record<string, string> = {
    主任医师: "Chief Physician",
    副主任医师: "Associate Chief Physician",
    主治医师: "Attending Physician",
  };
  return map[title] ?? title;
}

function doctorNameToEn(name: string): string {
  const map: Record<string, string> = {
    李海峰: "Haifeng Li",
    周宁: "Ning Zhou",
    王晨: "Chen Wang",
    陈静: "Jing Chen",
    赵志强: "Zhiqiang Zhao",
    胡蓉: "Rong Hu",
    顾晨: "Chen Gu",
    邵敏: "Min Shao",
    陈立: "Li Chen",
    袁杰: "Jie Yuan",
    林佳: "Jia Lin",
    徐宁: "Ning Xu",
    高远: "Yuan Gao",
    张洁: "Jie Zhang",
    宋杰: "Jie Song",
  };
  return map[name] ?? name;
}

function doctorTextToEn(text: string): string {
  let out = text;
  for (const n of DOCTOR_NAMES) {
    out = out.split(n).join(doctorNameToEn(n));
  }
  out = out
    .split("主任医师")
    .join("Chief Physician")
    .split("副主任医师")
    .join("Associate Chief Physician")
    .split("主治医师")
    .join("Attending Physician");
  return out;
}

function specialtyToEn(text: string): string {
  return replaceAllByMap(text, [
    ["头痛、眩晕", "headache, dizziness"],
    ["脑血管病", "cerebrovascular disease"],
    ["睡眠障碍", "sleep disorders"],
    ["高血压", "hypertension"],
    ["冠心病", "coronary artery disease"],
    ["心律失常", "arrhythmia"],
    ["胃肠功能病", "functional GI disorders"],
    ["肝胆胰疾病", "hepato-pancreato-biliary disease"],
    ["腹痛腹泻", "abdominal pain & diarrhea"],
    ["鼻炎鼻窦炎", "rhinitis & sinusitis"],
    ["咽喉炎", "pharyngitis"],
    ["眩晕耳鸣", "vertigo & tinnitus"],
    ["屈光与视疲劳", "refraction & eye strain"],
    ["眼底病", "fundus disorders"],
    ["角膜结膜病", "cornea/conjunctiva disorders"],
    ["湿疹荨麻疹", "eczema & urticaria"],
    ["真菌感染", "fungal infection"],
    ["痤疮皮炎", "acne & dermatitis"],
    ["颈肩腰腿痛", "neck/shoulder/back/leg pain"],
    ["关节损伤", "joint injury"],
    ["运动损伤", "sports injury"],
    ["尿路感染", "urinary tract infection"],
    ["前列腺疾病", "prostate disease"],
    ["泌尿结石", "urinary stones"],
    ["月经异常", "menstrual disorders"],
    ["盆腔炎", "pelvic inflammatory disease"],
    ["妇科内分泌", "gynecologic endocrinology"],
    ["小儿呼吸道", "pediatric respiratory"],
    ["小儿消化", "pediatric GI"],
    ["小儿发热", "pediatric fever"],
    ["发热分诊", "fever triage"],
    ["呼吸道感染", "respiratory infection"],
    ["传染病筛查", "infectious disease screening"],
    ["急危重救治", "critical care"],
    ["创伤急救", "trauma emergency"],
    ["中毒救治", "toxicology emergency"],
    ["抑郁焦虑评估", "depression/anxiety evaluation"],
    ["危机干预", "crisis intervention"],
    ["情绪障碍管理", "mood disorder management"],
    ["常见病筛查", "common disease screening"],
    ["多系统评估", "multi-system evaluation"],
    ["慢病管理", "chronic disease management"],
  ]);
}

function examNameToEn(text: string): string {
  return replaceAllByMap(text, [
    ["头颅 MRI", "Brain MRI"],
    ["颈动脉彩超", "Carotid Ultrasound"],
    ["血脂/血糖", "Lipid/Glucose Panel"],
    ["腹部超声", "Abdominal Ultrasound"],
    ["粪便常规", "Stool Routine"],
    ["胃功能检测", "Gastric Function Test"],
    ["肝胆胰脾生化", "Hepato-Pancreatic Biochemistry"],
    ["血常规", "CBC"],
    ["C 反应蛋白", "C-Reactive Protein"],
    ["甲/乙流抗原", "Influenza A/B Antigen"],
    ["胸部 DR", "Chest DR"],
    ["肺炎支原体抗体", "Mycoplasma Pneumoniae Antibody"],
    ["心理评估量表", "Psychological Assessment Scale"],
    ["精神科门诊访谈", "Psychiatric Outpatient Interview"],
    ["尿常规", "Urinalysis"],
    ["阿莫西林胶囊", "Amoxicillin Capsules"],
    ["蒙脱石散", "Montmorillonite Powder"],
    ["口服补液盐", "Oral Rehydration Salts"],
  ]);
}

function locationToEn(text: string): string {
  return replaceAllByMap(text, [
    ["影像中心 2F", "Imaging Center 2F"],
    ["超声科 3F", "Ultrasound 3F"],
    ["检验科 1F", "Lab 1F"],
    ["门诊 5F-12 诊室", "Outpatient 5F-12"],
    ["门诊 5F-06 诊室", "Outpatient 5F-06"],
    ["门诊 3F-09 诊室", "Outpatient 3F-09"],
    ["门诊 4F-11 诊室", "Outpatient 4F-11"],
    ["门诊 4F-03 诊室", "Outpatient 4F-03"],
    ["门诊 2F-15 诊室", "Outpatient 2F-15"],
    ["门诊 3F-16 诊室", "Outpatient 3F-16"],
    ["门诊 3F-05 诊室", "Outpatient 3F-05"],
    ["门诊 2F-08 诊室", "Outpatient 2F-08"],
    ["儿科门诊 1F-06 诊室", "Pediatrics 1F-06"],
    ["发热门诊 1F-03 诊室", "Fever Clinic 1F-03"],
    ["门诊 6F-02 诊室", "Outpatient 6F-02"],
    ["急诊楼 1F 分诊区", "Emergency Building 1F Triage"],
    ["门诊 2F-06 诊室", "Outpatient 2F-06"],
    ["门诊楼", "Outpatient Building"],
    ["人工服务窗口 1F-A02", "Manual Service Window 1F-A02"],
    ["门诊大厅 1 层", "Outpatient Hall 1F"],
    ["心理测评室 6F", "Psychology Assessment Room 6F"],
    ["精神心理门诊 6F", "Mental Health Clinic 6F"],
  ]);
}

/**
 * 根据语言将就医数据本地化为英文显示。
 */
function localizeJourney(journey: MockJourneyData, lang: AppLang): MockJourneyData {
  if (lang !== "en") return journey;
  const recommendation = {
    department: deptToEn(journey.recommendation.department),
    reason: zhToEnText(journey.recommendation.reason, `Recommended based on ${HOSPITAL_NAME_EN} symptom triage profile.`),
    doctorHint: zhToEnText(journey.recommendation.doctorHint, `Please start with ${HOSPITAL_NAME_EN} general outpatient evaluation.`),
    queueHint: zhToEnText(journey.recommendation.queueHint, "Estimated wait 15-30 min."),
  };
  const doctorCandidates = journey.doctorCandidates.map((d) => ({
    ...d,
    name: doctorNameToEn(d.name),
    title: titleToEn(d.title),
    specialty: specialtyToEn(d.specialty),
  }));
  const appointmentDoctor = journey.appointment.doctor.split(" ");
  const appointmentDoctorName = doctorNameToEn(appointmentDoctor[0] ?? journey.appointment.doctor);
  const appointmentDoctorTitle = titleToEn(appointmentDoctor.slice(1).join(" ").trim());
  const appointment = {
    ...journey.appointment,
    department: recommendation.department,
    room: locationToEn(journey.appointment.room),
    doctor: `${appointmentDoctorName}${appointmentDoctorTitle ? ` ${appointmentDoctorTitle}` : ""}`,
  };
  const payments = {
    ...journey.payments,
    items: journey.payments.items.map((item) => ({
      ...item,
      name: replaceAllByMap(doctorTextToEn(examNameToEn(item.name)), [["挂号费", "Registration Fee"]]),
    })),
  };
  return {
    ...journey,
    patient: {
      ...journey.patient,
      maskedName: "Zhang M.",
      gender: journey.patient.gender === "男" ? ("Male" as unknown as "男") : ("Female" as unknown as "女"),
      cardType: journey.patient.cardType === "医保电子码" ? ("Insurance QR" as unknown as "医保电子码") : ("Insurance Card" as unknown as "医保实体卡"),
    },
    hospital: {
      name: "Shanghai Xinhua Hospital",
      campus: locationToEn(journey.hospital.campus),
    },
    recommendation,
    doctorCandidates,
    appointment,
    queue: {
      ...journey.queue,
      estimatedTime: journey.queue.estimatedTime.replace("分钟", " min"),
    },
    payments,
    report: {
      ...journey.report,
      title: replaceAllByMap(journey.report.title, [
        ["呼吸道病原检测报告", "Respiratory Pathogen Report"],
        ["门诊检验综合报告", "Outpatient Lab Report"],
      ]),
    },
    examPlan: {
      ...journey.examPlan,
      items: journey.examPlan.items.map((item) => ({
        ...item,
        name: examNameToEn(item.name),
        location: locationToEn(item.location),
        prep: zhToEnText(item.prep, "Follow onsite instructions."),
      })),
      groups: journey.examPlan.groups.map((g) => ({
        title: replaceAllByMap(locationToEn(g.title), [["检查项", " Exams"]]),
        exams: g.exams.map((e) => ({
          ...e,
          name: replaceAllByMap(examNameToEn(e.name), [["（", " ("], ["）", ")"]]),
        })),
      })),
      planningReason: "Planned by fasting requirement, queue time, and walking distance.",
    },
    medicinePlan: {
      ...journey.medicinePlan,
      items: journey.medicinePlan.items.map((item) => ({
        ...item,
        name: examNameToEn(item.name),
        spec: item.spec
          .replace("粒", " tabs")
          .replace("袋", " sachets"),
      })),
    },
    assist: {
      ...journey.assist,
      window: locationToEn(journey.assist.window),
      checklist: ["Bring ID", "Bring insurance credential", "Bring registration/payment records"],
    },
  };
}

/**
 * 统一补充医院语境，确保推荐话术体现“上海新华医院”。
 */
function attachHospitalContext(input: Recommendation): Recommendation {
  const reason = input.reason.includes(HOSPITAL_NAME_ZH) ? input.reason : `${HOSPITAL_NAME_ZH}：${input.reason}`;
  const doctorHint = input.doctorHint.includes(HOSPITAL_NAME_ZH)
    ? input.doctorHint
    : `${HOSPITAL_NAME_ZH}建议：${input.doctorHint}`;
  return {
    ...input,
    reason,
    doctorHint,
  };
}

/**
 * 判断检查项是否属于异常候选。
 */
export function isAbnormalItem(name: string, symptomInput: string, idx: number): boolean {
  const lowerName = name.toLowerCase();
  const lowerSymptom = symptomInput.toLowerCase();
  return (
    name.includes("C 反应蛋白") ||
    name.includes("甲/乙流抗原") ||
    name.includes("支原体") ||
    lowerName.includes("c-reactive protein") ||
    lowerName.includes("influenza a/b antigen") ||
    lowerName.includes("mycoplasma") ||
    ((symptomInput.includes("发热") || lowerSymptom.includes("fever")) && idx === 0)
  );
}

/**
 * 根据优先级对医生候选进行排序。
 */
export function sortDoctorCandidatesByPriority(
  candidates: DoctorCandidate[],
  priority: PriorityMode
): DoctorCandidate[] {
  const copied = [...candidates];
  if (priority === "time-first") {
    return copied.sort((a, b) => a.waitMinutes - b.waitMinutes);
  }
  return copied.sort((a, b) => b.authorityScore - a.authorityScore);
}

/**
 * 根据症状推荐挂号科室（模拟规则）。
 */
export function recommendBySymptom(rawSymptom: string): Recommendation {
  const symptom = rawSymptom.trim();
  const lower = symptom.toLowerCase();
  const has = (zh: string, en?: string) => symptom.includes(zh) || (en ? lower.includes(en) : false);
  // 心理危机/伤害倾向表达：优先精神心理相关门诊。
  if (
    has("想死", "want to die") ||
    has("自杀", "suicide") ||
    has("不想活", "suicidal") ||
    has("活不下去", "kill myself") ||
    has("跳楼", "jump off") ||
    has("杀人", "kill someone") ||
    has("伤人", "hurt someone") ||
    has("自残", "self harm") ||
    has("轻生", "homicide")
  ) {
    return {
      department: "精神心理科",
      reason: "检测到心理危机相关表达，建议优先至精神心理门诊进行评估与干预。",
      doctorHint: "请尽快前往精神心理门诊，系统已优先匹配当班医生。",
      queueHint: "建议优先就诊，必要时由人工协助绿色通道。",
    };
  }
  // 危险症状优先急诊。
  if (
    has("胸痛", "chest pain") ||
    has("胸闷", "chest tightness") ||
    has("呼吸困难", "shortness of breath") ||
    has("抽搐", "convulsion") ||
    has("意识不清", "confused") ||
    has("昏迷", "coma") ||
    has("大出血", "bleeding")
  ) {
    return {
      department: "急诊医学科",
      reason: "当前症状存在潜在急危重风险，建议立即急诊评估。",
      doctorHint: "请优先到急诊分诊台，必要时走绿色通道。",
      queueHint: "急诊按分级优先处理。",
    };
  }

  if (has("头疼", "headache") || has("头痛", "head pain") || has("眩晕", "dizzy")) {
    return {
      department: "神经内科",
      reason: "头痛/眩晕常见于神经系统相关问题，优先建议神经内科评估。",
      doctorHint: "建议选择神经内科普通门诊（必要时转专病门诊）。",
      queueHint: "预计候诊 20-35 分钟。",
    };
  }
  if (
    has("心慌", "palpitation") ||
    has("心悸", "heart racing") ||
    has("心前区", "precordial") ||
    has("胸口痛", "chest pain")
  ) {
    return {
      department: "心血管内科",
      reason: "心悸/胸前区不适优先排查心血管系统问题。",
      doctorHint: "建议挂心血管内科，必要时完善心电图检查。",
      queueHint: "预计候诊 20-40 分钟。",
    };
  }
  if (
    has("怀孕", "pregnant") ||
    has("妊娠", "pregnancy") ||
    has("孕吐", "morning sickness")
  ) {
    return {
      department: "妇科",
      reason: "孕期相关症状建议优先至妇科（妇产方向）评估。",
      doctorHint: "建议妇科门诊就诊，必要时完善超声与激素相关检查。",
      queueHint: "预计候诊 20-35 分钟。",
    };
  }
  if (has("肚子疼", "stomachache") || has("腹痛", "abdominal pain") || has("胃痛", "stomach pain")) {
    return {
      department: "消化内科",
      reason: "腹痛/胃部不适优先由消化内科进行初步判断。",
      doctorHint: "建议选择消化内科普通门诊。",
      queueHint: "预计候诊 15-30 分钟。",
    };
  }
  if (
    has("腹泻", "diarrhea") ||
    has("反酸", "acid reflux") ||
    has("恶心", "nausea") ||
    has("呕吐", "vomit")
  ) {
    return {
      department: "消化内科",
      reason: "消化道相关症状与消化内科匹配度较高。",
      doctorHint: "建议先消化内科评估，再决定是否转科。",
      queueHint: "预计候诊 15-30 分钟。",
    };
  }
  if (has("发烧", "fever") || has("发热", "fever") || has("咳嗽", "cough")) {
    return {
      department: "发热门诊",
      reason: "发热伴呼吸道症状优先进入发热门诊进行分诊和筛查。",
      doctorHint: "建议先挂发热门诊，按院感流程就诊。",
      queueHint: "预计候诊 25-40 分钟。",
    };
  }
  if (
    has("咽痛", "sore throat") ||
    has("喉咙痛", "throat pain") ||
    has("鼻塞", "stuffy nose") ||
    has("流鼻涕", "runny nose") ||
    has("耳鸣", "tinnitus") ||
    has("耳痛", "ear pain")
  ) {
    return {
      department: "耳鼻咽喉科",
      reason: "鼻咽喉和耳部症状优先由耳鼻咽喉科处理。",
      doctorHint: "建议耳鼻咽喉科普通门诊。",
      queueHint: "预计候诊 20-30 分钟。",
    };
  }
  if (
    has("眼痛", "eye pain") ||
    has("眼红", "red eye") ||
    has("视力下降", "vision loss") ||
    has("看不清", "blurred vision")
  ) {
    return {
      department: "眼科",
      reason: "视觉和眼部症状建议先眼科检查。",
      doctorHint: "建议眼科普通门诊，必要时验光/眼底检查。",
      queueHint: "预计候诊 15-25 分钟。",
    };
  }
  if (
    has("皮疹", "rash") ||
    has("瘙痒", "itch") ||
    has("过敏", "allergy") ||
    has("荨麻疹", "hives") ||
    has("脱发", "hair loss") ||
    has("掉发", "hair fall") ||
    has("长痘", "acne") ||
    has("痘痘", "pimple") ||
    has("闭口", "comedone")
  ) {
    return {
      department: "皮肤科",
      reason: "皮肤与毛发相关表现（含痤疮、脱发）优先皮肤科评估。",
      doctorHint: "建议皮肤科门诊，避免自行使用刺激性护肤或药物。",
      queueHint: "预计候诊 15-30 分钟。",
    };
  }
  if (
    has("腰痛", "back pain") ||
    has("膝盖痛", "knee pain") ||
    has("关节痛", "joint pain") ||
    has("扭伤", "sprain") ||
    has("骨折", "fracture")
  ) {
    return {
      department: "骨科",
      reason: "骨关节及运动系统不适优先骨科评估。",
      doctorHint: "建议骨科普通门诊，必要时拍片检查。",
      queueHint: "预计候诊 20-35 分钟。",
    };
  }
  if (
    has("尿频", "urinary frequency") ||
    has("尿急", "urinary urgency") ||
    has("尿痛", "painful urination") ||
    has("血尿", "blood in urine")
  ) {
    return {
      department: "泌尿外科",
      reason: "泌尿系统症状建议先由泌尿外科评估。",
      doctorHint: "建议泌尿外科门诊，必要时做尿常规和超声。",
      queueHint: "预计候诊 20-35 分钟。",
    };
  }
  if (
    has("月经不调", "irregular period") ||
    has("生理期混乱", "irregular menstruation") ||
    has("经期紊乱", "period disorder") ||
    has("小腹绞痛", "lower abdominal cramp") ||
    has("下腹坠痛", "pelvic pain") ||
    has("妇科", "gynecology") ||
    has("白带异常", "abnormal discharge")
  ) {
    return {
      department: "妇科",
      reason: "女性生殖系统相关症状建议妇科就诊。",
      doctorHint: "建议妇科普通门诊。",
      queueHint: "预计候诊 20-35 分钟。",
    };
  }
  if (
    has("小孩", "child") ||
    has("儿童", "kid") ||
    has("宝宝", "baby") ||
    has("婴儿", "infant")
  ) {
    return {
      department: "儿科",
      reason: "儿童患者建议优先儿科专科就诊。",
      doctorHint: "建议儿科普通门诊或发热门诊（如伴发热）。",
      queueHint: "预计候诊 20-40 分钟。",
    };
  }
  return {
    department: "全科医学科",
    reason: "当前症状未匹配到单一专科，建议先全科分诊后再转诊。",
    doctorHint: "建议先挂全科普通门诊。",
    queueHint: "预计候诊 10-20 分钟。",
  };
}

/**
 * 生成高真实性模拟就医数据，确保全流程前后一致。
 */
export function buildMockJourneyData(
  symptom: string,
  evidence: FlowEvidence,
  options?: MockBuildOptions
): MockJourneyData {
  const rawRec = attachHospitalContext(
    options?.forcedRecommendation ?? options?.aiRecommendation ?? recommendBySymptom(symptom)
  );
  const rec = {
    ...rawRec,
    department: deptToZh(rawRec.department),
  };
  const baseRoomByDept: Record<string, string> = {
    神经内科: "门诊 5F-12 诊室",
    心血管内科: "门诊 5F-06 诊室",
    消化内科: "门诊 3F-09 诊室",
    耳鼻咽喉科: "门诊 4F-11 诊室",
    眼科: "门诊 4F-03 诊室",
    皮肤科: "门诊 2F-15 诊室",
    骨科: "门诊 3F-16 诊室",
    泌尿外科: "门诊 3F-05 诊室",
    妇科: "门诊 2F-08 诊室",
    儿科: "儿科门诊 1F-06 诊室",
    发热门诊: "发热门诊 1F-03 诊室",
    急诊医学科: "急诊楼 1F 分诊区",
    精神心理科: "门诊 6F-02 诊室",
    全科医学科: "门诊 2F-06 诊室",
  };
  const baseDoctorByDept: Record<string, string> = {
    神经内科: "李海峰 主任医师",
    心血管内科: "赵志强 主任医师",
    消化内科: "周宁 主任医师",
    耳鼻咽喉科: "胡蓉 副主任医师",
    眼科: "顾晨 副主任医师",
    皮肤科: "邵敏 主任医师",
    骨科: "陈立 主任医师",
    泌尿外科: "袁杰 副主任医师",
    妇科: "林佳 主任医师",
    儿科: "徐宁 主任医师",
    发热门诊: "王晨 副主任医师",
    急诊医学科: "急诊值班团队",
    精神心理科: "宋杰 主任医师",
    全科医学科: "陈静 副主任医师",
  };

  const waitingCount = evidence.queueStatus === "排队中" ? 4 : 7;
  const appointmentTime = "10:20 - 10:40";

  const doctorCandidates = options?.aiDoctors?.length ? options.aiDoctors : generateDoctorsByDepartment(rec.department);
  const selectedDoctorName = options?.selectedDoctorName ?? "";
  const selectedDoctor =
    doctorCandidates.find((d) => d.name === selectedDoctorName || doctorNameToEn(d.name) === selectedDoctorName) ??
    doctorCandidates[0];
  const examItemsByDept: Record<
    string,
    { name: string; location: string; prep: string; needFasting: boolean; queueMinutes: number; distanceMeters: number }[]
  > = {
    神经内科: [
      { name: "头颅 MRI", location: "影像中心 2F", prep: "去除金属物品", needFasting: false, queueMinutes: 28, distanceMeters: 240 },
      { name: "颈动脉彩超", location: "超声科 3F", prep: "按号候检", needFasting: false, queueMinutes: 16, distanceMeters: 180 },
      { name: "血脂/血糖", location: "检验科 1F", prep: "空腹 8 小时", needFasting: true, queueMinutes: 12, distanceMeters: 120 },
    ],
    消化内科: [
      { name: "腹部超声", location: "超声科 3F", prep: "空腹 6 小时", needFasting: true, queueMinutes: 22, distanceMeters: 220 },
      { name: "粪便常规", location: "检验科 1F", prep: "按要求留样", needFasting: false, queueMinutes: 10, distanceMeters: 120 },
      { name: "胃功能检测", location: "检验科 1F", prep: "空腹 8 小时", needFasting: true, queueMinutes: 14, distanceMeters: 120 },
      { name: "肝胆胰脾生化", location: "检验科 1F", prep: "空腹 8 小时", needFasting: true, queueMinutes: 18, distanceMeters: 120 },
    ],
    发热门诊: [
      { name: "血常规", location: "检验科 1F", prep: "到检验窗口采血", needFasting: false, queueMinutes: 12, distanceMeters: 90 },
      { name: "C 反应蛋白", location: "检验科 1F", prep: "到检验窗口采血", needFasting: false, queueMinutes: 10, distanceMeters: 90 },
      { name: "甲/乙流抗原", location: "检验科 1F", prep: "咽拭子采样", needFasting: false, queueMinutes: 8, distanceMeters: 90 },
      { name: "胸部 DR", location: "影像中心 2F", prep: "摘除金属饰品", needFasting: false, queueMinutes: 15, distanceMeters: 150 },
      { name: "肺炎支原体抗体", location: "检验科 1F", prep: "到检验窗口采血", needFasting: false, queueMinutes: 14, distanceMeters: 90 },
    ],
    精神心理科: [
      { name: "心理评估量表", location: "心理测评室 6F", prep: "按指导完成问卷", needFasting: false, queueMinutes: 12, distanceMeters: 140 },
      { name: "精神科门诊访谈", location: "精神心理门诊 6F", prep: "如实描述近期情绪与行为", needFasting: false, queueMinutes: 18, distanceMeters: 120 },
    ],
    全科医学科: [
      { name: "血常规", location: "检验科 1F", prep: "到检验窗口采血", needFasting: false, queueMinutes: 12, distanceMeters: 100 },
      { name: "尿常规", location: "检验科 1F", prep: "按要求留样", needFasting: false, queueMinutes: 9, distanceMeters: 100 },
    ],
  };
  const rawExamItems =
    options?.aiExamItems?.length
      ? options.aiExamItems
      : examItemsByDept[rec.department] ?? examItemsByDept["全科医学科"];
  // 智能规划：优先空腹项目 -> 同类内按排队时间 -> 再按步行距离。
  const examItems = [...rawExamItems]
    .sort((a, b) => {
      if (a.needFasting !== b.needFasting) return a.needFasting ? -1 : 1;
      if (a.queueMinutes !== b.queueMinutes) return a.queueMinutes - b.queueMinutes;
      return a.distanceMeters - b.distanceMeters;
    })
    .map((item, idx) => ({ ...item, order: idx + 1 }));
  const groupsByLocation = examItems.reduce<Record<string, { name: string; status: "pending" | "completed" }[]>>(
    (acc, item) => {
      if (!acc[item.location]) acc[item.location] = [];
      acc[item.location].push({
        name: `${item.order}. ${item.name}`,
        status: "pending",
      });
      return acc;
    },
    {}
  );
  const examGroups = Object.entries(groupsByLocation).map(([location, exams]) => ({
    title: `${location}检查项`,
    exams,
  }));
  // 检查缴费时，费用明细严格与检查项目一一对应，不额外添加其它项目。
  const examPaymentItems = examItems.map((item) => {
    const basePrice = item.name.includes("MRI")
      ? 280
      : item.name.includes("DR")
        ? 120
        : item.name.includes("超声")
          ? 140
          : item.name.includes("抗原")
            ? 58
            : item.name.includes("支原体")
              ? 66
              : 36;
    return { name: item.name, price: basePrice };
  });
  const paymentItems =
    options?.paymentMode === "registration-only"
      ? [{ name: `${selectedDoctor.name}${selectedDoctor.title} 挂号费`, price: selectedDoctor.consultationFee }]
      : examPaymentItems;
  const total = paymentItems.reduce((sum, item) => sum + item.price, 0);
  const medicineItems = options?.aiMedicineItems?.length
    ? options.aiMedicineItems
    : [
        { name: "阿莫西林胶囊", spec: "0.25g*24粒", qty: 1, price: 28 },
        { name: "蒙脱石散", spec: "3g*10袋", qty: 1, price: 22 },
        { name: "口服补液盐", spec: "5.125g*6袋", qty: 1, price: 15 },
      ];
  const medicineTotal = medicineItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const patientName = options?.patientProfile?.name?.trim() || "张*明";
  const patientAge = Number(options?.patientProfile?.age ?? 46);
  const patientGender = options?.patientProfile?.gender === "女" ? "女" : "男";

  const journey: MockJourneyData = {
    symptomInput: symptom,
    patient: {
      maskedName: patientName,
      age: Number.isFinite(patientAge) ? Math.max(1, patientAge) : 46,
      gender: patientGender,
      cardType: "医保电子码",
      visitNo: "OP202603250918",
    },
    hospital: {
      name: "上海新华医院",
      campus: "门诊楼 A 区",
    },
    recommendation: rec,
    doctorCandidates,
    appointment: {
      date: "2026-03-25",
      timeSlot: appointmentTime,
      department: rec.department,
      room: baseRoomByDept[rec.department] ?? "门诊 2F-06 诊室",
      doctor: selectedDoctor ? `${selectedDoctor.name} ${selectedDoctor.title}` : baseDoctorByDept[rec.department] ?? "值班医生",
    },
    queue: {
      currentNumber: "A046",
      waitingCount,
      estimatedTime: `${Math.max(waitingCount * 3, 10)}分钟`,
    },
    payments: {
      items: paymentItems,
      total,
    },
    report: {
      title: rec.department === "发热门诊" ? "呼吸道病原检测报告" : "门诊检验综合报告",
      date: "2026-03-25 11:36",
      id: "LAB-20260325-8891",
    },
    examPlan: {
      items: examItems,
      groups: examGroups,
      planningReason: "已按是否空腹、排队时间、步行距离进行智能顺序规划",
    },
    medicinePlan: {
      items: medicineItems,
      total: medicineTotal,
    },
    assist: {
      window: "人工服务窗口 1F-A02",
      code: "HELP-2309",
      checklist: ["携带身份证", "携带医保凭证", "携带挂号/缴费记录"],
    },
  };
  return localizeJourney(journey, options?.lang ?? "zh");
}

