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
    en: "Optimal range (m)",
    zh: "最佳射程 (m)",
    ja: "最適射程 (m)",
  },
  "label.falloffRange": {
    en: "Falloff range (m)",
    zh: "衰减射程 (m)",
    ja: "フォールオフ射程 (m)",
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
  "label.overloadShort": {
    en: "OL",
    zh: "超载",
    ja: "OH",
  },
  "propulsion.none": {
    en: "None",
    zh: "无",
    ja: "なし",
  },
  "hint.hullSearch": {
    en: "Type ship name…",
    zh: "输入舰船名称…",
    ja: "艦船名を入力…",
  },
  "label.maxSpeed": {
    en: "Max speed (m/s)",
    zh: "最大速度 (m/s)",
    ja: "最大速度 (m/s)",
  },
  "label.mass": {
    en: "Mass (kg)",
    zh: "质量 (kg)",
    ja: "質量 (kg)",
  },
  "label.inertiaModifier": {
    en: "Inertia modifier (s/kg)",
    zh: "惯性修正 (s/kg)",
    ja: "慣性修正係数 (s/kg)",
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
    en: "Desired range (m)",
    zh: "期望距离 (m)",
    ja: "希望射程 (m)",
  },
  "label.initialDistance": {
    en: "Initial distance (m)",
    zh: "初始距离 (m)",
    ja: "初期距離 (m)",
  },
  "section.targetShip": {
    en: "Target ship",
    zh: "目标舰船",
    ja: "ターゲット艦船",
  },
  "section.targetProfile": {
    en: "Target profile",
    zh: "目标属性",
    ja: "ターゲットプロファイル",
  },
  "label.signatureRadius": {
    en: "Signature radius (m)",
    zh: "信号半径 (m)",
    ja: "信号半径 (m)",
  },
  "label.simulationSpeed": {
    en: "Speed",
    zh: "速度",
    ja: "速度",
  },
  "button.play": {
    en: "Play",
    zh: "播放",
    ja: "再生",
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
  "select.profile": {
    en: "Select profile...",
    zh: "选择配置...",
    ja: "プロファイルを選択...",
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
