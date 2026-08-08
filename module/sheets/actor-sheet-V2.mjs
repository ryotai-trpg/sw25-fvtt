import { prepareActiveEffectCategories } from "../helpers/effects.mjs";
import {
  prepareItemContext,
  prepareColorSetting,
  prepareAbilityLabels,
  prepareActorEditors,
} from "../helpers/actor-context.mjs";
import { SW25DocumentSheetMixin } from "./document-sheet-mixin.mjs";
import { SW25ActorActionsMixin } from "./actor-sheet-actions.mjs";

const TPL = "systems/sw25/templates/actor/parts";

/**
 * アクターシート(ApplicationV2)の共通部分。
 *
 * テンプレートは V1 と 1 本を共有する(`parts/actor-<type>-body.hbs`)。
 * PART を 1 枚だけ置き `root: true` にしてあるのは、
 *
 *   1. `#sidebar-hidden` の隠しチェックボックスと `.sw25pc` が
 *      `#sidebar-hidden:checked ~ .sw25pc` という兄弟セレクタで
 *      サイドバーの開閉を作っており、2 つが兄弟のまま並ぶ必要がある。
 *      複数ルートを許すのは root パートだけ
 *      (`handlebars-application.mjs` の `#parsePartHTML`)
 *   2. 5,900 行のテンプレートをタブごとに切り直す価値が無い
 *
 * 操作は `SW25ActorActionsMixin` 側(V1 と共通)。
 * こちらが持つのは AppV2 固有の配線 —— コンテキスト、タブ、委譲リスナ。
 */
export class SW25ActorSheetV2 extends SW25ActorActionsMixin(
  SW25DocumentSheetMixin(foundry.applications.sheets.ActorSheetV2)
) {
  /** classes は継承チェーンでマージされる(`sw25` は mixin 側から降りてくる) */
  static DEFAULT_OPTIONS = {
    classes: ["sheet", "actor"],
    position: { width: 800, height: 700 },
  };

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;

    context.actor = actor;
    context.token = this.token;
    context.isOwner = actor.isOwner;

    // V1 は `toObject(false)` を通した配列だったが、こちらは生の Document を渡す。
    // 宣言していない派生値もそのまま読めるので、アイテム行が空になる制約がない
    context.items = [...actor.items].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.rollData = actor.getRollData();

    prepareItemContext(context);
    prepareAbilityLabels(actor.system);

    // アクターのシートはアイテムが持つバフも並べる。
    // mixin の既定(自分の effects だけ)を上書きする
    context.effects = prepareActiveEffectCategories(actor.allApplicableEffects());

    context.colorSetting = prepareColorSetting(actor.system);
    Object.assign(context, await prepareActorEditors(actor));

    return context;
  }

  /* -------------------------------------------- */
  /*  タブ                                        */
  /* -------------------------------------------- */

  /**
   * 本体の `changeTab` を使わずここで切り替える。
   *
   * 本体は `.tabs [data-group][data-tab]` を探すが、このシートの見出しは
   * `data-group` を `<nav>` 側に持つ。キャラクターの主タブに至っては
   * `.tabs` を持たない(`.tab-switcher` として縦に浮かせてある。`tabs` を
   * 足すと `.sw25 .sheet-tabs.tabs` の `border: 0` / `flex-wrap: wrap` を
   * 拾って V1 の見た目まで変わる)。マークアップのほうに合わせる。
   *
   * @param {string} tab
   * @param {string} group
   * @param {object} [options]
   */
  changeTab(tab, group, { force = false, updatePosition = true } = {}) {
    if (!tab || !group) {
      throw new Error("You must pass both the tab and tab group identifier");
    }
    if (this.tabGroups[group] === tab && !force) return;

    const root = this.element;
    for (const link of root.querySelectorAll(`nav[data-group="${group}"] [data-tab]`)) {
      link.classList.toggle("active", link.dataset.tab === tab);
    }
    for (const section of root.querySelectorAll(`.tab[data-group="${group}"]`)) {
      section.classList.toggle("active", section.dataset.tab === tab);
    }

    this.tabGroups[group] = tab;
    if (updatePosition) this._refit();
  }

  /**
   * 描画のたびに、いま開いているタブへ `.active` を付け直す。
   *
   * `<nav data-group>` を数えるので、フェロー用の差し替えタブ
   * (`fellowAction` / `fellowSetting`)も特別扱いせずに済む。
   * 覚えているタブがそのレイアウトに無ければ先頭に落とす —— V1 の
   * `Tabs` が `initial` を見つけられなかったときと同じふるまい。
   */
  _activateTabs() {
    for (const nav of this.element.querySelectorAll("nav[data-group]")) {
      const group = nav.dataset.group;
      const ids = [...nav.querySelectorAll("[data-tab]")].map((a) => a.dataset.tab);
      if (!ids.length) continue;
      const tab = ids.includes(this.tabGroups[group]) ? this.tabGroups[group] : ids[0];
      this.changeTab(tab, group, { force: true, updatePosition: false });
    }
  }

  /* -------------------------------------------- */
  /*  イベント配線                                 */
  /* -------------------------------------------- */

  /**
   * 委譲リスナは**最初の描画のときだけ**張る。
   * (張るクラスの一覧は `SW25ActorActionsMixin` 側。V1 と同じ組を使う)
   *
   * ApplicationV2 は再描画で PART の中身だけを差し替え、
   * ルート要素は使い回すので、`_onRender` で張るとリスナが積み上がる。
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const root = this.element;
    root.addEventListener("click", (event) => this.#dispatchClick(event));
    root.addEventListener("change", (event) => this.#dispatchChange(event));
    this.#bindBookmarkScroll(root);
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this._activateTabs();
  }

  /**
   * 当たったものを**すべて**呼ぶ。
   *
   * V1 の `html.on("click", selector, ...)` は 1 回のクリックで
   * 当たったハンドラを全部呼んでいた。`.roll-actiontable` のように
   * `.rollable` も一緒に持つ要素があるので、最初の 1 つで打ち切ると挙動が変わる。
   */
  #dispatchClick(event) {
    if (event.button !== 0) return;

    // タブの見出し
    const link = event.target.closest("nav[data-group] [data-tab]");
    if (link && !link.classList.contains("active")) {
      const group = link.closest("nav[data-group]").dataset.group;
      this.changeTab(link.dataset.tab, group, { event });
      return;
    }

    const cls = this.constructor;
    const maps = this.isEditable
      ? [cls.VIEW_CLICKS, cls.EDIT_CLICKS]
      : [cls.VIEW_CLICKS];
    for (const map of maps) {
      for (const [selector, method] of Object.entries(map)) {
        const target = event.target.closest(selector);
        if (target) this[method](event, target);
      }
    }
  }

  #dispatchChange(event) {
    if (!this.isEditable) return;
    for (const [selector, method] of Object.entries(this.constructor.EDIT_CHANGES)) {
      const target = event.target.closest(selector);
      if (target) this[method](event, target);
    }
  }

  /**
   * ブックマーク帯の横スクロール。
   *
   * 位置はシートを開いている間だけ覚えていればよいので
   * クロージャに閉じ込める。再描画で `#bookmark-inner` は作り直されるため
   * 押されたときに引き直す。
   */
  #bindBookmarkScroll(root) {
    const STEP = 116;
    let offset = 0;
    root.addEventListener("click", (event) => {
      const button = event.target.closest(".scroll-button");
      if (!button) return;
      const outer = root.querySelector("#bookmark-outer");
      const inner = root.querySelector("#bookmark-inner");
      if (!outer || !inner) return;
      if (button.classList.contains("left")) offset = Math.min(offset + STEP, 0);
      else offset = Math.max(offset - STEP, -(inner.scrollWidth - outer.clientWidth));
      inner.style.transform = `translateX(${offset}px)`;
    });
  }

  /* -------------------------------------------- */
  /*  ドラッグ & ドロップ                          */
  /* -------------------------------------------- */

  /**
   * 本体の既定は `.draggable` を掴む。このシートはアイテム行
   * (`li.item`)を掴んでマクロバーへ落とせるようにしてあるので張り替える。
   */
  get _dragDrop() {
    return (this.#dragDrop ??= new foundry.applications.ux.DragDrop.implementation({
      dragSelector: "li.item",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      },
    }));
  }

  #dragDrop = null;

  /**
   * @override
   * 行動表への drop はアイテムを作らず、落とした枠の目にそろえる。
   */
  async _onDrop(event) {
    const table = event.target.closest(".actiontable");
    if (table) return this._onActionTableDrag(event, table);
    return super._onDrop(event);
  }

  /**
   * @override
   * ブックマーク帯への drop は、既に持っているものなら印を付けるだけ。
   */
  async _onDropItem(event, item) {
    if (!event.target.closest(".bookmark-drop-area")) {
      return super._onDropItem(event, item);
    }
    return this._addBookmark(item);
  }
}

/* -------------------------------------------- */
/*  型ごとのシート                                */
/* -------------------------------------------- */

/**
 * PC。サイドバー(`sidebar`)と主タブ(`primary`)の 2 系統を持つ。
 *
 * `scrollable` に並べた 4 つは再描画をまたいでスクロール位置が保たれる
 * (本体の `_preSyncPartState` は `querySelector` 1 つずつなので id で指す)。
 * V1 はこれを `render()` の上書きと `setTimeout` でやっていた。
 */
export class SW25CharacterSheet extends SW25ActorSheetV2 {
  static DEFAULT_OPTIONS = { classes: ["character"] };

  static PARTS = {
    body: {
      root: true,
      template: `${TPL}/actor-character-body.hbs`,
      scrollable: ["#main-contents", "#sidebar-status", "#sidebar-battle", "#sidebar-adventure"],
    },
  };
}

/** NPC / フェロー */
export class SW25NpcSheet extends SW25ActorSheetV2 {
  static DEFAULT_OPTIONS = { classes: ["npc"], position: { width: 600, height: 600 } };

  static PARTS = { body: { root: true, template: `${TPL}/actor-npc-body.hbs` } };
}

/** 魔物 */
export class SW25MonsterSheet extends SW25ActorSheetV2 {
  static DEFAULT_OPTIONS = { classes: ["monster"] };

  static PARTS = { body: { root: true, template: `${TPL}/actor-monster-body.hbs` } };
}
