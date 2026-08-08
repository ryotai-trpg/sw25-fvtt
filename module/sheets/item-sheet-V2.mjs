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
   * @param {string} type アイテムの type。差分ファイルの名前と揃える
   */
  static headerPart(type) {
    return {
      template: `${TPL}/header.hbs`,
      templates: [`${TPL}/header/${type}.hbs`],
    };
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
