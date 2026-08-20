export type Language = "en" | "zh" | "ja";

export interface I18n {
  current(): Language;
  setLanguage(language: Language): void;
  t(key: string): string;
  translateDocument(): void;
}

export const I18N_DICTIONARY = {
  "app.subtitle": {
    en: "EVE Online 2D tactical simulator",
    zh: "EVE Online 2D 战术模拟器",
    ja: "EVE Online 2D 戦術シミュレーター",
  },
  "lang.en": {
    en: "English",
    zh: "English",
    ja: "English",
  },
  "lang.zh": {
    en: "中文",
    zh: "中文",
    ja: "中文",
  },
  "lang.ja": {
    en: "日本語",
    zh: "日本語",
    ja: "日本語",
  },
  "section.attackerTurret": {
    en: "Attacker",
    zh: "攻击者",
    ja: "攻撃者",
  },
  "label.trackingSpeed": {
    en: "Tracking speed",
    zh: "跟踪速度",
    ja: "追跡速度",
  },
  "label.trackingScore": {
    en: "Score",
    zh: "评分",
    ja: "スコア",
  },
  "label.turretSigResolution": {
    en: "Turret sig. resolution",
    zh: "炮塔信号半径",
    ja: "タレット信号半径",
  },
  "label.optimalRange": {
    en: "Optimal range",
    zh: "最佳射程",
    ja: "最適射程",
  },
  "label.falloffRange": {
    en: "Falloff range",
    zh: "衰减射程",
    ja: "フォールオフ射程",
  },
  "section.attackerShip": {
    en: "Attacker ship",
    zh: "攻击者舰船",
    ja: "攻撃艦船",
  },
  "label.hull": {
    en: "Ship",
    zh: "舰船",
    ja: "艦船",
  },
  "label.propulsion": {
    en: "Propulsion",
    zh: "推进模块",
    ja: "推進モジュール",
  },
  "label.skillLevel": {
    en: "Pilot skills",
    zh: "飞行员技能",
    ja: "パイロットスキル",
  },
  "skill.level": {
    en: "Level",
    zh: "等级",
    ja: "レベル",
  },
  "label.overload": {
    en: "Overload",
    zh: "超载",
    ja: "オーバーヒート",
  },
  "label.language": {
    en: "Language",
    zh: "语言",
    ja: "言語",
  },

  "hint.hullSearch": {
    en: "Type ship name…",
    zh: "输入舰船名称…",
    ja: "艦船名を入力…",
  },
  "label.maxSpeed": {
    en: "Max speed",
    zh: "最大速度",
    ja: "最大速度",
  },
  "label.mass": {
    en: "Mass",
    zh: "质量",
    ja: "質量",
  },
  "label.inertiaModifier": {
    en: "Inertia modifier",
    zh: "惯性修正",
    ja: "慣性修正係数",
  },
  "label.mode": {
    en: "Mode",
    zh: "模式",
    ja: "モード",
  },
  "mode.orbit": {
    en: "Orbit",
    zh: "环绕",
    ja: "周回",
  },
  "mode.keepAtRange": {
    en: "Keep at range",
    zh: "保持距离",
    ja: "距離を保つ",
  },
  "label.desiredRange": {
    en: "Desired range",
    zh: "期望距离",
    ja: "希望射程",
  },
  "label.maneuverAggressivity": {
    en: "Maneuver aggressivity",
    zh: "机动激进程度",
    ja: "機動の積極さ",
  },
  "hint.maneuverAggressivity": {
    en: "Controls reactive braking as the ship approaches its set range. Higher values maneuver more aggressively, brake later, and tolerate more overshoot; lower values hold the range more strictly.",
    zh: "控制接近设定距离时的反应制动。较高值机动更激进、更晚制动并允许更多超调；较低值更严格保持距离。",
    ja: "設定距離への接近時の反応的ブレーキを制御します。高い値ほど機動を積極的に行い、ブレーキが遅く、オーバーシュートを許容します。低い値ほど距離を厳密に保ちます。",
  },
  "hint.initialDistance": {
    en: "Changes apply on reset.",
    zh: "更改在重置时生效。",
    ja: "変更はリセット時に適用されます。",
  },
  "label.gridBrightness": {
    en: "Grid brightness",
    zh: "网格亮度",
    ja: "グリッドの明るさ",
  },
  "label.version": {
    en: "Version",
    zh: "版本",
    ja: "バージョン",
  },
  "label.initialDistance": {
    en: "Initial distance",
    zh: "初始距离",
    ja: "初期距離",
  },
  "section.targetShip": {
    en: "Target",
    zh: "目标",
    ja: "ターゲット",
  },
  "section.targetProfile": {
    en: "Target profile",
    zh: "目标属性",
    ja: "ターゲットプロファイル",
  },
  "label.signatureRadius": {
    en: "Signature radius",
    zh: "信号半径",
    ja: "信号半径",
  },
  "label.simulationSpeed": {
    en: "Speed",
    zh: "速度",
    ja: "速度",
  },
  "button.play": {
    en: "Simulate",
    zh: "模拟",
    ja: "シミュレート",
  },
  "button.pause": {
    en: "Pause",
    zh: "暂停",
    ja: "一時停止",
  },
  "button.reset": {
    en: "Reset",
    zh: "重置",
    ja: "リセット",
  },
  "button.save": {
    en: "Save",
    zh: "保存",
    ja: "保存",
  },
  "button.delete": {
    en: "Delete",
    zh: "删除",
    ja: "削除",
  },
  "button.copyLink": {
    en: "Copy link",
    zh: "复制链接",
    ja: "リンクをコピー",
  },
  "label.profileName": {
    en: "Profile name",
    zh: "配置名称",
    ja: "プロファイル名",
  },
  "label.author": {
    en: "Author:",
    zh: "作者：",
    ja: "作者：",
  },
  "label.corp": {
    en: "Corp:",
    zh: "公司：",
    ja: "コーポ：",
  },
  "select.profile": {
    en: "Select profile...",
    zh: "选择配置...",
    ja: "プロファイルを選択...",
  },
  "profile.tip": {
    en: "If you like this tool, may consider tip me in the game, thank you!",
    zh: "如果喜欢这个工具，可以在游戏中打赏我，谢谢！",
    ja: "このツールが気に入ったら、ゲーム内でチップをくれると嬉しいです、ありがとう！",
  },
  "status.copied": {
    en: "Copied",
    zh: "已复制",
    ja: "コピー済み",
  },
  "status.failed": {
    en: "Failed",
    zh: "失败",
    ja: "失敗",
  },
  "result.distance": {
    en: "Distance",
    zh: "距离",
    ja: "距離",
  },
  "result.transversal": {
    en: "Transversal",
    zh: "横向速度",
    ja: "横断速度",
  },
  "result.angular": {
    en: "Angular",
    zh: "角速度",
    ja: "角速度",
  },
  "result.radial": {
    en: "Radial",
    zh: "径向速度",
    ja: "放射速度",
  },
  "result.trackingPenalty": {
    en: "Tracking penalty",
    zh: "跟踪惩罚",
    ja: "追跡ペナルティ",
  },
  "result.rangePenalty": {
    en: "Range penalty",
    zh: "射程惩罚",
    ja: "射程ペナルティ",
  },
  "result.hitChance": {
    en: "Hit chance",
    zh: "命中率",
    ja: "命中確率",
  },
  "readout.time": {
    en: "T +",
    zh: "T +",
    ja: "T +",
  },
  "readout.range": {
    en: "Range: ",
    zh: "距离：",
    ja: "距離：",
  },
  "readout.angular": {
    en: "Angular: ",
    zh: "角速度：",
    ja: "角速度：",
  },
  "readout.transversal": {
    en: "Transversal: ",
    zh: "横向速度：",
    ja: "横断速度：",
  },
  "readout.radial": {
    en: "Radial: ",
    zh: "径向速度：",
    ja: "放射速度：",
  },
  "readout.optimal": {
    en: "Optimal: ",
    zh: "最佳射程：",
    ja: "最適射程：",
  },
  "readout.falloff": {
    en: "Falloff: ",
    zh: "衰减射程：",
    ja: "フォールオフ射程：",
  },
  "readout.hitChance": {
    en: "Hit chance: ",
    zh: "命中率：",
    ja: "命中確率：",
  },
  "readout.none": {
    en: "none",
    zh: "无",
    ja: "なし",
  },
  "footer.about.heading": {
    en: "About Gunner",
    zh: "关于 Gunner",
    ja: "Gunner について",
  },
  "footer.about.text": {
    en: "Gunner is an EVE Online 2D tactical simulator. It models two ships in motion and computes turret hit chance.",
    zh: "Gunner 是一个 EVE Online 2D 战术模拟器，模拟两艘舰船的运动，并计算攻击方炮塔对目标的命中表现。",
    ja: "Gunner は EVE Online の 2D 戦術シミュレーターです。2 隻の艦船の動きを再現し、攻撃側のタレットの命中性能を計算します。",
  },
  "footer.mech.kinematics.heading": {
    en: "Kinematics",
    zh: "运动学",
    ja: "運動学",
  },
  "footer.mech.kinematics.text": {
    en: "Ships move with mass and inertia. Transversal, radial, and angular velocity describe target motion. Acceleration is exponential.",
    zh: "舰船运动由质量与惯性决定：横向、径向与角速度描述目标相对运动，加速度按指数趋近最大速度。",
    ja: "艦船の動きは質量と慣性で決まる：横断、放射、角速度が相対運動を表す。加速度は指数関数的に最大速度に近づく。",
  },
  "footer.mech.kinematics.link": {
    en: "Velocity",
    zh: "Velocity",
    ja: "Velocity",
  },
  "footer.mech.speed.heading": {
    en: "Speed",
    zh: "速度",
    ja: "速度",
  },
  "footer.mech.speed.text": {
    en: "Max velocity is hull base speed × propulsion bonus (afterburner / MWD) × skill modifiers; overloading boosts it further.",
    zh: "最大速度 = 船体基础速度 × 推进模块加成（加力 / 微曲）× 技能修正；超载进一步提升。",
    ja: "最大速度 = 船体ベース速度 × 推進モジュールボーナス（AB / MWD）× スキル補正。オーバーヒートでさらに上昇。",
  },
  "footer.mech.speed.link": {
    en: "Propulsion",
    zh: "Propulsion",
    ja: "Propulsion",
  },
  "footer.mech.hitChance.heading": {
    en: "Hit chance",
    zh: "命中率",
    ja: "命中確率",
  },
  "footer.mech.hitChance.text": {
    en: "Hit chance is 0.5^(tracking term + range term), using angular velocity, turret tracking, signature, and distance past optimal over falloff.",
    zh: "命中率 = 0.5^(追踪项 + 射程项)。追踪项来自角速度、炮塔跟踪、信号半径；射程项来自超出最佳射程的距离。",
    ja: "命中確率 = 0.5^(追跡項 + 射程項)。追跡項は角速度・追跡速度・信号半径、射程項は最適射程を超えた距離から求まる。",
  },
  "footer.mech.hitChance.link": {
    en: "Turret mechanics",
    zh: "Turret mechanics",
    ja: "Turret mechanics",
  },
  "unit.meter": {
    en: "m",
    zh: "m",
    ja: "m",
  },
  "unit.kilometer": {
    en: "km",
    zh: "km",
    ja: "km",
  },
} as const;

export class I18nImpl implements I18n {
  private readonly document: Document;
  private language: Language;

  constructor() {
    this.language = "en";
    this.document = globalThis.document;
    this.document.documentElement.lang = this.language;
  }

  current(): Language {
    return this.language;
  }

  setLanguage(language: Language): void {
    this.language = language;
    this.document.documentElement.lang = this.language;
  }

  t(key: string): string {
    const entry = (I18N_DICTIONARY as Record<string, Record<Language, string>>)[key];
    if (!entry) return key;
    return entry[this.language];
  }

  translateDocument(): void {
    for (const element of this.document.querySelectorAll("[data-i18n]")) {
      const key = element.getAttribute("data-i18n");
      if (key) setText(element, this.t(key));
    }
    for (const element of this.document.querySelectorAll("[data-i18n-placeholder]")) {
      const key = element.getAttribute("data-i18n-placeholder");
      if (key) (element as HTMLInputElement).placeholder = this.t(key);
    }
    for (const element of this.document.querySelectorAll("[data-i18n-aria-label]")) {
      const key = element.getAttribute("data-i18n-aria-label");
      if (key) element.setAttribute("aria-label", this.t(key));
    }
    for (const element of this.document.querySelectorAll("[data-i18n-title]")) {
      const key = element.getAttribute("data-i18n-title");
      if (key) (element as HTMLElement).title = this.t(key);
    }
  }
}

function setText(element: Element, text: string): void {
  element.textContent = text;
}
