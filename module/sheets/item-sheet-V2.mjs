import { SW25DocumentSheetMixin } from "./document-sheet-mixin.mjs";

const TPL = "systems/sw25/templates/item";

/**
 * アイテムシート(ApplicationV2)の共通部分。
 *
 * 24 型のシートはどれも「ヘッダ / タブ / 説明・詳細・バフ」という同じ骨格で、
 * 違うのはヘッダの一部と詳細タブの中身だけ。ここには骨格と共通の
 * コンテキストだけを置き、型ごとのシートは PARTS の並べ方と
 * 詳細タブの用意だけを持てばよい形にしている。
 *
 * 寸法・`submitOnChange`・バフの操作・編集モードは
 * `SW25DocumentSheetMixin` 側(アクターシートと共通)。
 */
export class SW25ItemSheetV2 extends SW25DocumentSheetMixin(
  foundry.applications.sheets.ItemSheetV2
) {
  /**
   * classes は継承チェーンでマージされるので `sw25` は mixin 側から降りてくる。
   * `standard-form` は本体の `.form-group` とタブのレイアウト規則が要るので足す。
   */
  static DEFAULT_OPTIONS = {
    classes: ["sheet", "item", "standard-form"],
    position: { width: 620, height: 480 },
  };

  /* -------------------------------------------- */
  /*  PARTS の部品                                 */
  /*  ※ PARTS は静的継承でマージされない。         */
  /*    具象シートが毎回すべて宣言すること。        */
  /* -------------------------------------------- */

  /**
   * ヘッダ。型ごとの差分は `templates/item/header/<type>.hbs` にあり、
   * 共通の枠(`header.hbs`)から動的パーシャルとして差し込む。
   * パーシャルは事前に読み込んでおく必要があるので `templates` に並べる。
   *
   * 名前の前後に印を出す型(魔法のアイテム、武器の斬撃/打撃など 5 型)は
   * `title: true` を渡すと `templates/item/title/<type>.hbs` も差し込む。
   * 差し込むかどうかは `_prepareContext` が **この `templates` を見て**決めるので、
   * 宣言はここ 1 箇所で済む。
   *
   * @param {string} type アイテムの type。差分ファイルの名前と揃える
   * @param {{title?: boolean}} [opts]
   */
  static headerPart(type, { title = false } = {}) {
    const templates = [`${TPL}/header/${type}.hbs`];
    if (title) templates.push(`${TPL}/title/${type}.hbs`);
    return { template: `${TPL}/header.hbs`, templates };
  }

  /** タブの見出し。本体の汎用テンプレートをそのまま使う */
  static TABS_PART = { template: "templates/generic/tab-navigation.hbs" };

  /** 説明タブ。全型で共通 */
  static DESCRIPTION_PART = {
    template: `${TPL}/description.hbs`,
    scrollable: [""],
  };

  /** 詳細タブ。中身は型ごとに違うので `templates/item/details/<type>.hbs` */
  static detailsPart(type) {
    return { template: `${TPL}/details/${type}.hbs`, scrollable: [""] };
  }

  /** バフタブ。全型で共通 */
  static EFFECTS_PART = { template: `${TPL}/effects.hbs`, scrollable: [""] };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // ヘッダの型別パーシャル。PARTS の `templates` に並べたものと同じ道を
    // アイテムの type から組み立てるので、書き写しのずれが起きない
    context.headerSlot = `${TPL}/header/${this.document.type}.hbs`;

    // 名前まわりの印。headerPart(type, {title: true}) を宣言した型だけ
    const titleSlot = `${TPL}/title/${this.document.type}.hbs`;
    if (this.constructor.PARTS.header?.templates?.includes(titleSlot)) {
      context.titleSlot = titleSlot;
    }

    // 共有パーシャル(item-usedice / item-usepower / item-elements)が
    // label の for と input の id を組むのに使う。V1 は `{{item._id}}` で
    // 引いていたが AppV2 のコンテキストに `item` は無いので、
    // V1 シート側でも同じ名前を渡して 1 組のパーシャルを共有する
    context.docId = this.document.id;

    // 説明は閉じたエディタに出す分だけ enrich しておく。
    // V1 の `{{editor}}` は enrich していなかったので、@UUID や
    // インラインロールが説明文の中で効くようになるのはここからの変化
    context.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.system.description,
        { relativeTo: this.document, rollData: this.document.getRollData() }
      );

    // 判定結果の適用先。monsterability だけ custom を出さないので上書きする
    context.applyOptions = {
      "-": "SW25.Item.Noapply",
      on: "SW25.Item.applyon",
      custom: "SW25.Item.Custom",
    };

    return context;
  }

  /* -------------------------------------------- */
  /*  型をまたいで使う入力の組み立て                */
  /* -------------------------------------------- */

  /**
   * ダメージ適用ボタンの種別。判定側は ck*bt、威力側は pw*bt と
   * 接頭辞だけが違う同じ 5 種で、20 型が同じ並びを持っている。
   */
  static DAMAGE_BUTTONS = [
    { key: "pd", label: "SW25.Item.pd" },
    { key: "md", label: "SW25.Item.md" },
    { key: "cd", label: "SW25.Item.cd" },
    { key: "hr", label: "SW25.Item.hr" },
    { key: "mr", label: "SW25.Item.mr" },
  ];

  /**
   * チャットカードに出すダメージ適用ボタンのチェックボックス。
   * @param {"ck"|"pw"} prefix 判定側か威力側か
   */
  _damageButtons(prefix) {
    const system = this.document.system;
    return SW25ItemSheetV2.DAMAGE_BUTTONS.map(({ key, label }) => {
      const field = `${prefix}${key}bt`;
      return {
        id: `${this.document.id}system.${field}`,
        name: `system.${field}`,
        value: system[field],
        label: game.i18n.localize(label),
      };
    });
  }

  /** 威力表の 3〜12 の行。テンプレートで 10 行を書き写さないための組み立て */
  _powerTableRows() {
    const system = this.document.system;
    return Array.from({ length: 10 }, (_, i) => i + 3).map((roll) => ({
      roll,
      id: `${this.document.id}system.pt${roll}`,
      name: `system.pt${roll}`,
      value: system[`pt${roll}`],
    }));
  }
}

/* -------------------------------------------- */
/*  型ごとのシート                                */
/* -------------------------------------------- */

/** 言語。タブは説明だけで、判定も威力もバフも持たない */
export class SW25LanguageSheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("language"),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.DESCRIPTION_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description");
}

/**
 * 判定アイテム。
 *
 * V1 のタブ見出しはバフがコメントアウトされていて、説明と詳細の 2 枚しか
 * 出ていなかった(テンプレートには効果タブの中身だけが残っていた)。
 * 挙動を変えないのでこちらも 2 枚にしている。
 */
export class SW25CheckSheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("check"),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.DESCRIPTION_PART,
    details: SW25ItemSheetV2.detailsPart("check"),
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details");

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system;

    context.overviewCards = [
      {
        span: 6,
        label: game.i18n.localize("SW25.Item.Overview"),
        value: system.overview,
      },
    ];
    context.checkmethodOptions = {
      normal: "SW25.Item.Check.Normalcheck",
      dice: "SW25.Item.Check.Customroll",
      power: "SW25.Item.Check.Powerroll",
    };
    context.checkDamageButtons = this._damageButtons("ck");
    context.powerDamageButtons = this._damageButtons("pw");
    context.powerTableRows = this._powerTableRows();

    return context;
  }
}

/**
 * 武器。
 *
 * 詳細タブは V1 と同じ共有パーシャル(属性・判定設定・威力設定)を使う。
 * 属性の自動セット(system.type → elements.physical)は
 * documents/item.mjs の `_preUpdate` が持つ。
 */
export class SW25WeaponSheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("weapon", { title: true }),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.DESCRIPTION_PART,
    details: SW25ItemSheetV2.detailsPart("weapon"),
    effects: SW25ItemSheetV2.EFFECTS_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system;
    const t = (key) => game.i18n.localize(key);

    context.overviewCards = [
      { span: 1, label: t("SW25.Item.Popularity"), value: system.info.popularity },
      { span: 3, label: t("SW25.Item.Shape"), value: system.info.shape },
      { span: 2, label: t("SW25.Item.Category"), value: `〈${system.categoryname}〉${system.rank}` },
      { span: 4, label: t("SW25.Item.Overview"), value: system.overview },
      { span: 2, label: t("SW25.Item.Create"), value: system.info.create },
    ];
    context.clickitemOptions = {
      all: "SW25.Item.All",
      power: "SW25.Item.Powerroll",
      dice: "SW25.Item.Diceroll",
      rescost: "SW25.Item.Resourcecost",
      description: "SW25.Item.Onlydescription",
    };

    return context;
  }
}

/** リソース(消耗品・素材・秘伝など)。 */
export class SW25ResourceSheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("resource"),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.DESCRIPTION_PART,
    details: SW25ItemSheetV2.detailsPart("resource"),
    effects: SW25ItemSheetV2.EFFECTS_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.overviewCards = [
      {
        span: 6,
        label: game.i18n.localize("SW25.Item.Overview"),
        value: this.document.system.overview,
      },
    ];
    return context;
  }
}
