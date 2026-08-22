import type { Language } from "./i18n";

export interface Hint {
  readonly text: Readonly<Record<Language, string>>;
}

export const HINT_CANDIDATES: readonly Hint[] = [
  {
    text: {
      en: "You can import a ship fitting from clipboard.",
      zh: "你可以从剪贴板导入舰船装配。",
      ja: "クリップボードから艦船フィッティングをインポートできます。",
    },
  },
  {
    text: {
      en: "'Midships' means putting the rudder to the center position.",
      zh: "‘正舵’意味着将舵置于中心位置。",
      ja: "‘ミッドシップ’は、舵を中心位置に置くことを意味します。",
    },
  },
  {
    text: {
      en: "Imported fittings are saved per hull and can be reselected from the fitting menu.",
      zh: "导入的装配会按舰船保存，可在装备菜单中重新选择。",
      ja: "インポートしたフィッティングはホール毎に保存され、装備メニューから再選択できます。",
    },
  },
  {
    text: {
      en: "Pressing Esc closes any open popup or fitting preview.",
      zh: "按 Esc 可关闭任何打开的弹窗或装备预览。",
      ja: "Esc キーで開いているポップアップやフィッティングプレビューを閉じることができます。",
    },
  },
  {
    text: {
      en: "Your setup can be saved as a profile that persists across sessions.",
      zh: "可以将当前设置保存为配置，下次访问时自动恢复。",
      ja: "現在の設定をプロファイルとして保存し、次回訪問時に復元できます。",
    },
  },
  {
    text: {
      en: "The initial distance takes effect only after pressing Reset.",
      zh: "初始距离只有在重置后才会生效。",
      ja: "初期距離はリセット後にのみ適用されます。",
    },
  },
] as const;

export const TIP_TEXT: Readonly<Record<Language, string>> = {
  en: "If you like this tool, may consider tip me in the game, thank you!",
  zh: "如果喜欢这个工具，可以在游戏中打赏我，谢谢！",
  ja: "このツールが気に入ったら、ゲーム内でチップをくれると嬉しいです、ありがとう！",
} as const;
