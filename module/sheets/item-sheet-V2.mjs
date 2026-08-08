import { SW25DocumentSheetMixin } from "./document-sheet-mixin.mjs";
import { sessionResult } from "../helpers/sessionresult.mjs";

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
    actions: {
      fieldCreate: this.#onFieldCreate,
      fieldDelete: this.#onFieldDelete,
      fieldMoveUp: this.#onFieldMoveUp,
      fieldMoveDown: this.#onFieldMoveDown,
    },
  };

  /* -------------------------------------------- */
  /*  カスタム項目(otherfeature / session)         */
  /* -------------------------------------------- */

  /**
   * `system.customFields` を配列として取り出す。
   *
   * 保存の往復で配列がキー付きオブジェクトに化けることがあるので、
   * V1 の実装と同じく両方を受ける。
   */
  get _customFields() {
    const raw = this.document.system.customFields ?? [];
    return Array.isArray(raw) ? [...raw] : Object.values(raw);
  }

  _rowIndex(target) {
    return Number(target.closest("[data-idx]")?.dataset.idx);
  }

  static async #onFieldCreate() {
    await this.document.update({
      "system.customFields": [...this._customFields, { label: "", value: "" }],
    });
  }

  static async #onFieldDelete(event, target) {
    const fields = this._customFields;
    fields.splice(this._rowIndex(target), 1);
    await this.document.update({ "system.customFields": fields });
  }

  static async #onFieldMoveUp(event, target) {
    const fields = this._customFields;
    const i = this._rowIndex(target);
    if (i <= 0) return;
    [fields[i - 1], fields[i]] = [fields[i], fields[i - 1]];
    await this.document.update({ "system.customFields": fields });
  }

  static async #onFieldMoveDown(event, target) {
    const fields = this._customFields;
    const i = this._rowIndex(target);
    if (i < 0 || i >= fields.length - 1) return;
    [fields[i], fields[i + 1]] = [fields[i + 1], fields[i]];
    await this.document.update({ "system.customFields": fields });
  }

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
  static headerPart(type, { slot = type, title = false } = {}) {
    const headerSlot = `${TPL}/header/${slot}.hbs`;
    const titleSlot = title ? `${TPL}/title/${type}.hbs` : null;
    return {
      template: `${TPL}/header.hbs`,
      templates: titleSlot ? [headerSlot, titleSlot] : [headerSlot],
      // _prepareContext がここから読む。宣言はこの呼び出し 1 箇所で済む
      headerSlot,
      titleSlot,
    };
  }

  /** タブの見出し。本体の汎用テンプレートをそのまま使う */
  static TABS_PART = { template: "templates/generic/tab-navigation.hbs" };

  /** 説明タブ。全型で共通(概要カード + 本文エディタ) */
  static DESCRIPTION_PART = {
    template: `${TPL}/description.hbs`,
    templates: [`${TPL}/parts/editor.hbs`],
    scrollable: [""],
  };

  /**
   * 概要カードの形に収まらない型の説明タブ。
   * いまのところ技能(判定基準値のサイドバーを持つ)だけ。
   */
  static descriptionPart(type) {
    return {
      template: `${TPL}/description/${type}.hbs`,
      templates: [`${TPL}/parts/editor.hbs`],
      scrollable: [""],
    };
  }

  /** 詳細タブ。中身は型ごとに違うので `templates/item/details/<type>.hbs` */
  static detailsPart(type) {
    return { template: `${TPL}/details/${type}.hbs`, scrollable: [""] };
  }

  /** バフタブ。全型で共通 */
  static EFFECTS_PART = { template: `${TPL}/effects.hbs`, scrollable: [""] };

  /** カスタム項目タブ。otherfeature と session だけが持つ */
  static CUSTOMS_PART = { template: `${TPL}/customs.hbs`, scrollable: [""] };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // ヘッダに差し込むパーシャル。宣言は headerPart() の引数 1 箇所だけで、
    // PARTS へ書いた結果をそのまま読む(書き写しのずれが起きない)
    const header = this.constructor.PARTS?.header ?? {};
    context.headerSlot = header.headerSlot;
    if (header.titleSlot) context.titleSlot = header.titleSlot;

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

    // 抵抗設定。既定は system.resistinfo。番号付きの判定ブロックを持つ型は
    // ブロックごとに保存先が違うので、そちらのシートが渡し替える
    context.resistInfo = this._resistInfo("resistinfo");

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

  /** アイコンをクリックしたときに何を出すか。防具・装飾品・道具ほかで共通 */
  static CLICKITEM_BASIC = {
    all: "SW25.Item.All",
    power: "SW25.Item.Powerroll",
    dice: "SW25.Item.Diceroll",
    description: "SW25.Item.Onlydescription",
  };

  /** MP を消費する型(呪文・練技など) */
  static CLICKITEM_MP = {
    all: "SW25.Item.All",
    power: "SW25.Item.Powerroll",
    dice: "SW25.Item.Diceroll",
    mpcost: "SW25.Item.Mpcost",
    description: "SW25.Item.Onlydescription",
  };

  /** HP を消費する型(紡ぎ手の織成) */
  static CLICKITEM_HP = {
    all: "SW25.Item.All",
    power: "SW25.Item.Powerroll",
    dice: "SW25.Item.Diceroll",
    hpcost: "SW25.Item.Hpcost",
    description: "SW25.Item.Onlydescription",
  };

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

  /**
   * 装備品系(武器・防具・装飾品・道具)の説明タブの概要カード。
   * 5 枚の並びは同じで、「カテゴリ」の値だけが型ごとに違う。
   *
   * @param {string} category カテゴリ欄に出す文字列
   */
  _equipmentOverviewCards(category) {
    const system = this.document.system;
    const t = (key) => game.i18n.localize(key);
    return [
      { span: 1, label: t("SW25.Item.Popularity"), value: system.info.popularity },
      { span: 3, label: t("SW25.Item.Shape"), value: system.info.shape },
      { span: 2, label: t("SW25.Item.Category"), value: category },
      { span: 4, label: t("SW25.Item.Overview"), value: system.overview },
      { span: 2, label: t("SW25.Item.Create"), value: system.info.create },
    ];
  }

  /**
   * 使用タイミングのチェックボックス 5 つ。
   *
   * どれを編集させるかは型ごとに違う。常時・主動作が種別から決まる型
   * (呪文・練技など)では読むだけで、宣言はほとんどの型で読むだけ。
   *
   * @param {string[]} editable isEdit のときに触れるキー
   */
  _timingMarks(editable) {
    const system = this.document.system;
    return SW25ItemSheetV2.TIMING_MARKS.map(({ key, label }) => ({
      key,
      id: `${this.document.id}system.${key}`,
      name: `system.${key}`,
      value: system[key],
      label: game.i18n.localize(label),
      editable: editable.includes(key),
    }));
  }

  static TIMING_MARKS = [
    { key: "constant", label: "SW25.Item.Constant" },
    { key: "main", label: "SW25.Item.Main" },
    { key: "aux", label: "SW25.Item.Aux" },
    { key: "prep", label: "SW25.Item.Prep" },
    { key: "decla", label: "SW25.Item.Declaabbr" },
  ];

  /**
   * 特技・呪文系のヘッダ見出し。多くの型が「<レベル>レベル<種別名>」の 1 行。
   * 型名は `TYPES.Item.<type>` から引く。
   */
  _abilitySubtitle() {
    const system = this.document.system;
    return [
      `${system.level}${game.i18n.localize("SW25.Level")}${game.i18n.localize(
        `TYPES.Item.${this.document.type}`
      )}`,
    ];
  }

  /**
   * 抵抗設定 1 組。`parts/detail-resist.hbs` に渡す。
   *
   * @param {string} path `system.` を除いた保存先。"resistinfo" や "dice1.resist"
   */
  _resistInfo(path) {
    const value = foundry.utils.getProperty(this.document.system, path) ?? {};
    return {
      name: `system.${path}`,
      type: value.type,
      input: value.input,
      result: value.result,
    };
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

/* -------------------------------------------- */
/*  特技・呪文系(13 型)                          */
/* -------------------------------------------- */

/**
 * 特技・呪文系の土台。
 *
 * 13 型はどれも「見出し + 起動/ブックマーク」「概要カード + 本文」
 * 「固有欄 + 使用タイミング + リソース」「判定使用 / 威力使用(抵抗込み)」
 * という同じ骨格を持つ。違いは
 *   - ヘッダの見出し文(`_abilitySubtitle()`)
 *   - どのタイミングを編集させるか(`TIMING_EDITABLE`)
 *   - アイコンクリック時の選択肢(`CLICKITEM`)
 * の 3 つに収まるので、具象シートはそれだけを宣言する。
 */
class SW25AbilitySheet extends SW25ItemSheetV2 {
  /** isEdit のときに触れるタイミング。既定は読むだけ */
  static TIMING_EDITABLE = [];

  static CLICKITEM = SW25ItemSheetV2.CLICKITEM_BASIC;

  /**
   * PARTS の並びも共通。ヘッダの差分は 13 型で 1 本
   * (`templates/item/header/ability.hbs`)を共有する。
   *
   * @param {string} type
   * @param {{customs?: boolean}} [opts] カスタム項目タブを持つか
   */
  static abilityParts(type, { customs = false } = {}) {
    const parts = {
      header: SW25ItemSheetV2.headerPart(type, { slot: "ability" }),
      tabs: SW25ItemSheetV2.TABS_PART,
      description: SW25ItemSheetV2.descriptionPart(type),
      details: SW25ItemSheetV2.detailsPart(type),
      effects: SW25ItemSheetV2.EFFECTS_PART,
    };
    if (customs) parts.customs = SW25ItemSheetV2.CUSTOMS_PART;
    return parts;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.subtitleLabels = this._abilitySubtitle();
    context.timingMarks = this._timingMarks(this.constructor.TIMING_EDITABLE);
    context.clickitemOptions = this.constructor.CLICKITEM;
    return context;
  }
}

/** 呪文。系統ごとに見出しの後ろに付く情報が違う */
export class SW25SpellSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("spell");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["aux", "prep"];
  static CLICKITEM = SW25ItemSheetV2.CLICKITEM_MP;

  /** @override */
  _abilitySubtitle() {
    const s = this.document.system;
    const t = (key) => game.i18n.localize(key);
    // 妖精魔法の一部はレベルではなくランク表記
    const unit = ["prop", "special"].includes(s.fairytype)
      ? t("SW25.Rank")
      : t("SW25.Level");
    const labels = [`${s.level}${unit}${s.typename}`];

    if (s.type === "priest" && s.sect) {
      labels.push(`${t("SW25.Item.Spell.Specialpriest")} : ${s.sect}`);
    }
    if (s.type === "magitech") {
      labels.push(`${t("SW25.Item.Spell.Magispfere")} : ${s.magispfere}`);
    }
    if (s.type === "fairy") {
      const prop =
        s.fairytype === "propfairy"
          ? ` (${Handlebars.helpers.localizeFairyProp(s.fairyprop)})`
          : "";
      labels.push(`${s.fairytypename}${t("SW25.Item.Spell.Fairy")}${prop}`);
    }
    return labels;
  }
}

/** 練技 */
export class SW25EnhanceartsSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("enhancearts");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["aux", "prep"];
  static CLICKITEM = SW25ItemSheetV2.CLICKITEM_MP;
}

/** 魔物歌 */
export class SW25MagicalsongSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("magicalsong");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
}

/** 騎乗技 */
export class SW25RidingtrickSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("ridingtrick");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["constant", "main", "aux"];
}

/** 錬金術 */
export class SW25AlchemytechSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("alchemytech");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["aux", "prep"];

  /** 素材の色ごとの消費を見出しの 2 行目に出す */
  static ALCHEMY_COSTS = [
    { key: "red", label: "SW25.Item.Alchemytech.Red" },
    { key: "green", label: "SW25.Item.Alchemytech.Green" },
    { key: "black", label: "SW25.Item.Alchemytech.Black" },
    { key: "white", label: "SW25.Item.Alchemytech.White" },
    { key: "gold", label: "SW25.Item.Alchemytech.Gold" },
  ];

  /** @override */
  _abilitySubtitle() {
    const s = this.document.system;
    const costs = SW25AlchemytechSheet.ALCHEMY_COSTS.filter((c) => s[c.key] !== 0)
      .map((c) => `${game.i18n.localize(c.label)}${s[c.key]}`)
      .join(" ");
    return [
      ...super._abilitySubtitle(),
      `${game.i18n.localize("SW25.Cost")} : ${costs}`,
    ];
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.resistOptions = {
      decide: "SW25.Item.Decide",
      any: "SW25.Item.Any",
      disappear: "SW25.Item.Disappear",
      shortening: "SW25.Item.Shortening",
    };
    return context;
  }
}

/** 相域 */
export class SW25PhaseareaSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("phasearea");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
}

/** 練技(戦術) */
export class SW25TacticsSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("tactics");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["aux", "prep"];
}

/** 賦術 */
export class SW25InfusionSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("infusion");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["constant", "main", "aux"];
}

/** 蛮族特殊能力 */
export class SW25BarbarousskillSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("barbarousskill");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["constant", "main", "aux"];
  static CLICKITEM = SW25ItemSheetV2.CLICKITEM_MP;

  /** @override */
  _abilitySubtitle() {
    const s = this.document.system;
    return [
      game.i18n.format("SW25.Item.BarbarousSkill.Ability", { race: s.race }),
      `${game.i18n.localize("SW25.Item.BarbarousSkill.Rank")}:${s.rank}`,
    ];
  }
}

/** 紡ぎ手の織成 */
export class SW25EssenceweaveSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("essenceweave");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["constant", "main", "aux", "prep"];
  static CLICKITEM = SW25ItemSheetV2.CLICKITEM_HP;

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.resistOptions = {
      decide: "SW25.Item.Decide",
      any: "SW25.Item.Any",
      none: "SW25.Item.None",
      disappear: "SW25.Item.Disappear",
      halving: "SW25.Item.Halving",
    };
    return context;
  }
}

/** その他の特技。24 型で唯一 session 以外にカスタム項目タブを持つ */
export class SW25OtherfeatureSheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("otherfeature", { customs: true });
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects", "customs");
  static TIMING_EDITABLE = ["constant", "main", "aux", "prep", "decla"];
  static CLICKITEM = SW25ItemSheetV2.CLICKITEM_MP;

  /** @override */
  _abilitySubtitle() {
    return [
      `${game.i18n.localize("SW25.Item.Otherfeature.Type")} : ${this.document.system.type}`,
    ];
  }
}

/** 種族特徴 */
export class SW25RaceabilitySheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("raceability");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["constant", "main", "aux", "prep", "decla"];

  /** @override */
  _abilitySubtitle() {
    return [`${game.i18n.localize("SW25.Race")} : ${this.document.system.race}`];
  }
}

/** 戦闘特技 */
export class SW25CombatabilitySheet extends SW25AbilitySheet {
  static PARTS = SW25AbilitySheet.abilityParts("combatability");
  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");
  static TIMING_EDITABLE = ["aux", "prep"];

  /** @override */
  _abilitySubtitle() {
    return [this.document.system.typename];
  }
}

/**
 * セッション記録。
 *
 * V1 では 24 型のうち skill と並んで旧ヘッダ様式(編集トグル無し)のまま
 * 残っていた。共通ヘッダに寄せ、「結果を出力」ボタンとチャットに載せる
 * 項目のチェックをヘッダに置く(ユーザー判断)。
 */
export class SW25SessionSheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("session"),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.descriptionPart("session"),
    details: SW25ItemSheetV2.detailsPart("session"),
    customs: SW25ItemSheetV2.CUSTOMS_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details", "customs");

  static DEFAULT_OPTIONS = {
    actions: { sessionResult: this.#onSessionResult },
  };

  /** チャットに載せる項目。ヘッダのチェックボックス 4 つ */
  static RESULT_TOGGLES = [
    { key: "basic", label: "SW25.Item.Session.BasicResult" },
    { key: "sword", label: "SW25.Item.Session.SwordResult" },
    { key: "character", label: "SW25.Item.Session.CharaResult" },
    { key: "custom", label: "SW25.Item.Session.CustomResult" },
  ];

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const result = this.document.system.result;
    context.resultToggles = SW25SessionSheet.RESULT_TOGGLES.map(({ key, label }) => ({
      key,
      id: `${this.document.id}system.result.${key}`,
      name: `system.result.${key}`,
      value: result[key],
      label: game.i18n.localize(label),
    }));
    return context;
  }

  static async #onSessionResult() {
    await sessionResult(this.document);
  }
}

/**
 * 魔物能力。
 *
 * 判定ブロックを 3 本持ち、それぞれに抵抗設定(`system.diceN.resist`)が付く。
 * 適用先の選択肢だけ他の型と違い、custom を出さない。
 */
export class SW25MonsterabilitySheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("monsterability"),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.descriptionPart("monsterability"),
    details: SW25ItemSheetV2.detailsPart("monsterability"),
    effects: SW25ItemSheetV2.EFFECTS_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.timingMarks = this._timingMarks([]);
    context.powerTableRows = this._powerTableRows();
    // 魔物能力だけは「任意の判定名」を出さない
    context.applyOptions = {
      "-": "SW25.Item.Noapply",
      on: "SW25.Item.applyon",
    };
    // V1 はこの 6 択を option でベタ書きしていた。判定 1〜3 は
    // 番号付きなので翻訳キー 1 本にならず、ここで組み立てる
    const t = (key) => game.i18n.localize(key);
    context.clickitemOptions = {
      all: t("SW25.Item.All"),
      description: t("SW25.Item.Onlydescription"),
      dice1: `${t("SW25.Check")} 1`,
      dice2: `${t("SW25.Check")} 2`,
      dice3: `${t("SW25.Check")} 3`,
      power: t("SW25.Item.Powerroll"),
    };
    return context;
  }
}

/** 行動(フェロー・デーモンの行動表)。判定ブロックを 1 本持つ */
export class SW25ActionSheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("action"),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.descriptionPart("action"),
    details: SW25ItemSheetV2.detailsPart("action"),
    effects: SW25ItemSheetV2.EFFECTS_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.clickitemOptions = {
      all: "SW25.Item.All",
      power: "SW25.Item.Power",
      dice2: "SW25.Check",
      dice1: "SW25.Item.Action.ActionValue",
      mpcost: "SW25.Item.Mpcost",
      description: "SW25.Item.Onlydescription",
    };
    return context;
  }
}

/**
 * 技能。
 *
 * V1 は 24 型のうち session と並んで旧ヘッダ様式(編集トグル無し、入力は常時有効)
 * のまま残っていた。他の型と同じ共通ヘッダに寄せ、入力も isEdit で縛る
 * (ユーザー判断)。説明タブは概要カードではなく判定基準値のサイドバーなので
 * 型ごとのテンプレートを使う。
 */
export class SW25SkillSheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("skill"),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.descriptionPart("skill"),
    details: SW25ItemSheetV2.detailsPart("skill"),
    effects: SW25ItemSheetV2.EFFECTS_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");

  /** サイドバーに並べる能力値。判定基準値は毎回計算される派生値 */
  static SKILL_BASE_ABILITIES = ["dex", "agi", "str", "vit", "int", "mnd"];

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const base = this.document.system.skillbase;

    context.skillBaseRows = SW25SkillSheet.SKILL_BASE_ABILITIES.map((key) => ({
      key,
      label: game.i18n.localize(
        `SW25.Ability.${key.charAt(0).toUpperCase()}${key.slice(1)}.long`
      ),
      value: base[key],
    }));

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

    context.overviewCards = this._equipmentOverviewCards(
      `〈${system.categoryname}〉${system.rank}`
    );
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

/** 防具。武器と同じ骨格で、固有欄は用法・必筋・回避・防護点 */
export class SW25ArmorSheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("armor", { title: true }),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.DESCRIPTION_PART,
    details: SW25ItemSheetV2.detailsPart("armor"),
    effects: SW25ItemSheetV2.EFFECTS_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system;

    context.overviewCards = this._equipmentOverviewCards(
      `〈${system.categoryname}〉${system.rank}`
    );
    context.clickitemOptions = SW25ItemSheetV2.CLICKITEM_BASIC;

    return context;
  }
}

/** 装飾品。固有欄は装備部位と専用効果 */
export class SW25AccessorySheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("accessory", { title: true }),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.DESCRIPTION_PART,
    details: SW25ItemSheetV2.detailsPart("accessory"),
    effects: SW25ItemSheetV2.EFFECTS_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system;

    // 装備部位が未設定("-")のときは種別名だけを出す
    const part = system.accpartname === "-" ? "" : `:${system.accpartname}`;
    context.overviewCards = this._equipmentOverviewCards(
      `${game.i18n.localize("TYPES.Item.accessory")}${part}`
    );
    context.clickitemOptions = SW25ItemSheetV2.CLICKITEM_BASIC;

    return context;
  }
}

/** 道具。リソース設定を持たない以外は装備品系と同じ骨格 */
export class SW25ItemItemSheet extends SW25ItemSheetV2 {
  static PARTS = {
    header: SW25ItemSheetV2.headerPart("item", { title: true }),
    tabs: SW25ItemSheetV2.TABS_PART,
    description: SW25ItemSheetV2.DESCRIPTION_PART,
    details: SW25ItemSheetV2.detailsPart("item"),
    effects: SW25ItemSheetV2.EFFECTS_PART,
  };

  static TABS = SW25ItemSheetV2.tabs("description", "details", "effects");

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.overviewCards = this._equipmentOverviewCards(
      this.document.system.info.category
    );
    context.clickitemOptions = SW25ItemSheetV2.CLICKITEM_BASIC;

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
