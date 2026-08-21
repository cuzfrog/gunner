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
] as const;

export const TIP_TEXT: Readonly<Record<Language, string>> = {
  en: "If you like this tool, may consider tip me in the game, thank you!",
  zh: "如果喜欢这个工具，可以在游戏中打赏我，谢谢！",
  ja: "このツールが気に入ったら、ゲーム内でチップをくれると嬉しいです、ありがとう！",
} as const;
