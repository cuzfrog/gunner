import type { Language } from "./i18n";

export interface SlideText {
  readonly text: Readonly<Record<Language, string>>;
}

export const HINT_CANDIDATES: readonly SlideText[] = [
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

export const TIP_TEXT: SlideText = {
  text: {
    en: "If you like this tool, may consider tip me in the game, thank you!",
    zh: "如果喜欢这个工具，可以在游戏中打赏我，谢谢！",
    ja: "このツールが気に入ったら、ゲーム内でチップをくれると嬉しいです、ありがとう！",
  },
} as const;

export const LORES: readonly SlideText[] = [
  {
    text: {
      en: "The Leopard shuttle has the second-fastest warp speed in the game.",
      zh: "豹级穿梭机拥有全游戏第二快的跃迁速度。",
      ja: "レパード・シャトルはゲーム内で2番目に速いワープ速度を持つ。",
    },
  },
  {
    text: {
      en: "Interceptors are the fastest ship class in EVE, with the Claw reaching over 800 m/s sub-warp.",
      zh: "截击舰是EVE中最快的舰船级别，爪级的亚光速航速可超过800米/秒。",
      ja: "インターセプターはEVE最速の艦船クラスで、クローの亜光速速度は800m/sを超える。",
    },
  },
  {
    text: {
      en: "The Dramiel holding an MWD is faster than any interceptor in raw velocity.",
      zh: "装备微曲的德拉米尔，绝对速度超过任何截击舰。",
      ja: "MWDを装備したドラミエルは、素の速度ではどんなインターセプターよりも速い。",
    },
  },
  {
    text: {
      en: "The fastest sub-warp ship is the Pontifex command destroyer with a max-rolled 50MN MWD.",
      zh: "亚光速最快的是主教级指挥驱逐舰，搭载满加成的50MN微曲。",
      ja: "サブワープ最速はポンティフェックス指揮駆逐艦で、最大ロールの50MN MWDを積む。",
    },
  },
  {
    text: {
      en: "Covert Ops frigates and Interceptors share the fastest base warp speed at 8.00 AU/s.",
      zh: "隐秘行动护卫舰与截击舰同为基础跃迁速度最快的舰船，达8.00 AU/s。",
      ja: "コバットオプスフリゲートとインターセプターは、基本ワープ速度8.00 AU/sで最速を分け合う。",
    },
  },
  {
    text: {
      en: "Titans and Freighters are the slowest ships to warp, at just 1.5 AU/s per second.",
      zh: "泰坦和货舰是跃迁最慢的舰船，仅为1.5 AU/s。",
      ja: "タイタンとフレイターはワープが最も遅い艦船で、わずか1.5 AU/sしか出ない。",
    },
  },
  {
    text: {
      en: "Shuttles are immune to all warp disruption: probes, bubbles, and mobile disruptors.",
      zh: "穿梭机免疫一切跃迁干扰：探针、拦截泡和移动干扰器统统无效。",
      ja: "シャトルはあらゆるワープ妨害を無効化する：プローブ、バブル、モバイル妨害装置。",
    },
  },
  {
    text: {
      en: "The Abaddon and Apocalypse tie for the most battleship powergrid at 21,000 MW.",
      zh: "地狱天使级和末日审判级并列战列舰能量栅格榜首，高达21000 MW。",
      ja: "アバドンとアポカリプスは、21000 MWという戦艦最高パワーグリッドで並ぶ。",
    },
  },
  {
    text: {
      en: "Not even Abaddon can equip 8 Tachyon Beam Laser without power grid upgrade.",
      zh: "不做能量栅格升级的话，连地狱天使级也装不上8门超光速光束激光。",
      ja: "パワーグリッド強化なしでは、アバドンでもタキオンビームレーザーを8門は装備できない。",
    },
  },
  {
    text: {
      en: "Blasters have the best tracking speed of any turret type in the game.",
      zh: "在游戏内所有炮塔类型中，疾速炮的追踪转速最佳。",
      ja: "ブラスターはゲーム内の全タレットタイプの中で最も優れたトラッキング速度を持つ。",
    },
  },
  {
    text: {
      en: "Artillery has the worst tracking speed of any weapon system, even worse than railguns.",
      zh: "远程火炮是追踪转速最差的武器系统，甚至不如磁轨炮。",
      ja: "アーティラリーはレールガン以下の、全武器システム中最悪のトラッキング速度を持つ。",
    },
  },
  {
    text: {
      en: "Pulse lasers have the poorest close-range tracking of all short-range weapons.",
      zh: "在所有近程武器中，脉冲激光器的近距离追踪表现垫底。",
      ja: "パルスレーザーは、近距離武器の中で近接トラッキングが最も劣る。",
    },
  },
  {
    text: {
      en: "Beam lasers have the best long-range tracking of any turret system.",
      zh: "光束激光器拥有所有炮塔系统中最好的远距离追踪能力。",
      ja: "ビームレーザーは、あらゆるタレットシステムの中で長距離トラッキングが最良だ。",
    },
  },
  {
    text: {
      en: "Small turrets always track faster than their larger-size counterparts.",
      zh: "同系列炮台中，尺寸越小，追踪转速总是越快。",
      ja: "小口径のタレットは、同系の大型タレットよりも常に速くトラッキングする。",
    },
  },
  {
    text: {
      en: "The Velator corvette began as a Gallente passenger craft before being armed.",
      zh: "维拉托尔级巡防艇原是一艘盖伦特客船，后来才加装了武装。",
      ja: "ヴェラターは元々ガレンテの旅客船だったが、のちに武装化された。",
    },
  },
  {
    text: {
      en: "The first frigates were built by the Caldari to counter Gallente combat drones in the early war.",
      zh: "最早的护卫舰由加达里建造，用于在战争初期对抗盖伦特战斗无人机。",
      ja: "最初のフリゲートは、開戦初期にガレンテの戦闘ドローンへ対抗するためカルダリが建造した。",
    },
  },
  {
    text: {
      en: "The Megathron has served the Gallente Federation for nearly two decades in frontier conflicts.",
      zh: "万王宝座级已在边境冲突中为盖伦特联邦服役近二十年。",
      ja: "メガソロンは国境紛争において、ほぼ20年間ガレンテ連邦に仕えてきた。",
    },
  },
  {
    text: {
      en: "The Ragnarok, Minmatar Titan, draws its name from Norse mythology's prophesied end of the world.",
      zh: "米玛塔尔泰坦“诸神黄昏级”之名，源自北欧神话中预言的世界末日。",
      ja: "ミンマターのタイタン「ラグナロク」の名は、北欧神話が預言する世界の終わりに由来する。",
    },
  },
  {
    text: {
      en: "The Amarr practice the Reclaiming, a religious doctrine of conquering and enslaving other races.",
      zh: "艾玛人奉行“收复大业”，即征服并奴役其他种族的宗教教义。",
      ja: "アマーは他種族を征服し奴隷化する宗教教義「リクレイミング」を実践している。",
    },
  },
  {
    text: {
      en: "Enslaved by the Amarr for four centuries, the Minmatar rebelled in 23216 AD.",
      zh: "被艾玛奴役四个世纪后，米玛塔尔人于公元23216年发动了大起义。",
      ja: "ミンマター人は400年以上アマーに奴隷化された後、西暦23216年に大反乱を起こした。",
    },
  },
  {
    text: {
      en: "The Caldari state is a corporate oligarchy run by eight megacorporations.",
      zh: "加达里是一个由八大超级企业集团掌控的企业寡头国家。",
      ja: "カルダリは、8つの巨大企業が支配する企業寡頭制国家である。",
    },
  },
  {
    text: {
      en: "The Gallente Federation is a democracy of progress, dignity, and freedom.",
      zh: "盖伦特联邦是一个以进步、尊严与自由为理想的民主政体。",
      ja: "ガレンテ連邦は、進歩・尊厳・自由を理想とする民主主義国家である。",
    },
  },
  {
    text: {
      en: "The Jove are the most advanced human race, masters of genetic manipulation.",
      zh: "朱庇特人是科技最先进的人类种族，也是基因操控的大师。",
      ja: "ジョヴは遺伝子操作を極めた、最も技術的に進んだ人類種族である。",
    },
  },
  {
    text: {
      en: "The Minmatar have seven major tribes, including the Sebiestor, Brutor, and Thukker.",
      zh: "米玛塔尔人有七大部族，包括塞毕斯托、布鲁特和图克克尔等。",
      ja: "ミンマターにはセビストア、ブルーター、トゥッカーなど7つの主要部族がある。",
    },
  },
  {
    text: {
      en: "The Ammatar Mandate is an Amarr puppet state ruled by the Nefantar tribe.",
      zh: "阿玛塔委任领是由归顺艾玛的内凡塔部族统治的傀儡政权。",
      ja: "アマター・マンデートは、帰順したネファンター部族が治めるアマーの傀儡国家である。",
    },
  },
  {
    text: {
      en: "The EVE Gate was the ancient wormhole that brought humanity to New Eden; it collapsed in 8061 AD.",
      zh: "EVE之门是将人类带到新伊甸的古代虫洞，已于公元8061年崩塌。",
      ja: "EVEゲートは人類をニューエデンへ運んだ古代ワームホールで、8061年に崩壊した。",
    },
  },
  {
    text: {
      en: "The Yoiul Conference of YC0 established CONCORD and the universal YC calendar for all five empires.",
      zh: "YC0年的尤伊尔会议确立了CONCORD和五大帝国通用的YC历法。",
      ja: "YC0年のヨイウル会議でCONCORDと、五大帝国共通のYC暦が定められた。",
    },
  },
  {
    text: {
      en: "The Battle of Vak'Atioth was the worst military defeat in Amarr history, crushed by the Jovians.",
      zh: "瓦克阿提奥斯战役是艾玛史上最惨痛的败绩，朱庇特人将其彻底击溃。",
      ja: "ヴァクアティオスの戦いはジョヴに粉砕された、アマー史上最悪の敗北だった。",
    },
  },
  {
    text: {
      en: "New Eden's two largest space battles were Iyen-Oursta and Vak'Atioth.",
      zh: "新伊甸规模最大的两场太空战役是伊延奥尔斯塔和瓦克阿提奥斯。",
      ja: "ニューエデン史上最大と二番目の宇宙戦闘は、イエン・オウスタとヴァクアティオスだった。",
    },
  },
  {
    text: {
      en: "The Gallente-Caldari War lasted nearly a century before CONCORD brokered a peace treaty.",
      zh: "盖伦特与加达里的战争持续近一个世纪，最终由CONCORD斡旋达成和约。",
      ja: "ガレンテ・カルダリ戦争は1世紀近く続き、CONCORDの仲介で講和条約が結ばれた。",
    },
  },
  {
    text: {
      en: "The Jove gifted the hydrostatic capsule to the Caldari, birthing the immortal capsuleer era.",
      zh: "朱庇特人将流体静力舱赠予加达里，开启了不朽克隆飞行员的时代。",
      ja: "ジョヴがハイドロスタティック・カプセルをカルダリに授け、不死のキャプシアナー時代が始まった。",
    },
  },
  {
    text: {
      en: "Sansha Kuvakei built a nation of cybernetic slaves in the Stain region.",
      zh: "桑沙·库瓦凯曾在斯泰恩星域建立一个电子义体奴隶之国。",
      ja: "サンシャ・クヴァケイはステイン領域に電子制御の奴隷国家を築いた。",
    },
  },
  {
    text: {
      en: "The Blood Raiders are an Amarr cult harvesting blood in pursuit of immortality.",
      zh: "血掠者是艾玛的一个死亡教团，为追求永生而采集鲜血。",
      ja: "ブラッドレイダーズは不死を求めて血を収奪するアマーの死の教団である。",
    },
  },
  {
    text: {
      en: "The Sisters of EVE believe the EVE Gate can bring peace to New Eden.",
      zh: "EVE姐妹会相信，EVE之门能为新伊甸带来和平。",
      ja: "EVEの姉妹会は、EVEゲートがニューエデンに平和をもたらすと信じている。",
    },
  },
  {
    text: {
      en: "The Guristas were founded in YC94 by two Caldari Navy deserters: Fatal and The Rabbit.",
      zh: "古斯塔斯由两名加达里海军逃兵于YC94年创立：“致命者”与“兔子”。",
      ja: "グリスタスはYC94年、カルダリ海軍の脱走者フェイタルとザ・ラビットが設立した。",
    },
  },
  {
    text: {
      en: "Mordu's Legion was founded by Intaki exiles who fought for the Caldari Navy.",
      zh: "莫尔德军团由曾为加达里海军作战的因塔基流亡者所建。",
      ja: "モルドゥズ・リージョンは、カルダリ海軍に与したインタキ亡命者によって設立された。",
    },
  },
] as const;
