import { prepareActiveEffectCategories } from "../helpers/effects.mjs";
import {
  prepareItemContext,
  prepareColorSetting,
  prepareAbilityLabels,
  prepareActorEditors,
} from "../helpers/actor-context.mjs";
import { SW25ActorActionsMixin } from "./actor-sheet-actions.mjs";

/**
 * アクターシート(Application V1)。
 *
 * ApplicationV2 版(`actor-sheet-V2.mjs`)へ移した今も、シート選択を
 * 明示的に V1 へ固定しているワールドのために残してある。Phase 4 で消す。
 * 操作もテンプレートも V2 と共有していて、ここに残るのは V1 固有の配線だけ。
 *
 * @extends {foundry.appv1.sheets.ActorSheet}
 */
export class SW25ActorSheet extends SW25ActorActionsMixin(
  foundry.appv1.sheets.ActorSheet
) {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sw25", "sheet", "actor"],
      width: 800,
      height: 700,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "abilityskill",
        },
        {
          navSelector: ".sidebar-tabs",
          contentSelector: ".sidebar-body",
          initial: "status",
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/sw25/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /**
   * @override
   * 本文エディタの enrich に await が要るので async。
   * `Application#_render` は `getData()` を await する
   * (`appv1/api/application-v1.mjs:416`)。
   */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.data;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    // 共有テンプレートの `{{formInput}}` がスキーマのフィールドを引く
    context.systemFields = this.actor.system.schema.fields;
    context.flags = actorData.flags;
    context.isOwner = this.actor.isOwner;

    context.config = CONFIG.SW25;

    prepareItemContext(context);
    prepareAbilityLabels(context.system);

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    context.colorSetting = prepareColorSetting(actorData.system);

    // 本文エディタは `{{editor}}` ではなく `{{formInput}}` で
    // `<prose-mirror>` を出す。ApplicationV2 のシートと 1 本の
    // テンプレートを共有するため、V1 側でも同じキーを渡す
    Object.assign(context, await prepareActorEditors(this.actor));

    return context;
  }

  /* -------------------------------------------- */

  /**
   * @override
   * 張るクラスの一覧は `SW25ActorActionsMixin` 側にあり、
   * ApplicationV2 のシートと同じ組を使う。ハンドラは AppV2 の action と
   * 同じ `(event, target)` で受けるので、`currentTarget` を明示的に渡す。
   */
  activateListeners(html) {
    super.activateListeners(html);
    html = $(html);

    const delegate = (type, map) => {
      for (const [selector, method] of Object.entries(map)) {
        html.on(type, selector, (ev) => this[method](ev, ev.currentTarget));
      }
    };

    delegate("click", this.constructor.VIEW_CLICKS);

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    delegate("click", this.constructor.EDIT_CLICKS);
    delegate("change", this.constructor.EDIT_CHANGES);

    // 以下は V1 固有の配線。ApplicationV2 版は _onFirstRender と
    // DragDrop / _onDrop で同じことをしている

    // bookmark-scroll
    const outer = html.find("#bookmark-outer")[0];
    const inner = html.find("#bookmark-inner")[0];
    let currentOffset = 0;
    const scrollAmount = 116;

    html.find(".scroll-button.left").on("click", () => {
      currentOffset = Math.min(currentOffset + scrollAmount, 0); // 左限界
      inner.style.transform = `translateX(${currentOffset}px)`;
    });

    html.find(".scroll-button.right").on("click", () => {
      const maxOffset = -(inner.scrollWidth - outer.clientWidth);
      currentOffset = Math.max(currentOffset - scrollAmount, maxOffset); // 右限界
      inner.style.transform = `translateX(${currentOffset}px)`;
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find("li.item").each((i, li) => {
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

    // Drag action item to table
    html.find(`.actiontable`).on("drop", (ev) =>
      this._onActionTableDrag(ev, ev.currentTarget)
    );

    const dropArea = html.find(".bookmark-drop-area");
    if (dropArea.length > 0) {
      dropArea.on("drop", (ev) => this._onBookmarkDrop(ev, ev.currentTarget));
    }
  }

  /**
   * @override
   * 再描画でスクロール位置が飛ばないように覚えておく。
   * ApplicationV2 版は PART の `scrollable` が同じことをする。
   */
  async render(force = false, options = {}) {
    let scrollPositions = this.getScrollPositions(this.element);

    const rendered = await super.render(force, options);

    setTimeout(() => {
      if (this.element?.length) {
        this.setScrollPositions(this.element, scrollPositions);
      }
    }, 10);

    return rendered;
  }

    
  getScrollPositions(html) {
    const positions = {};
    let tmpCnt = 0;
    html.find('[data-scrollable="true"]').each((i, element) => {
      const id = element.id || `scrollable-${i}`;
      positions[id] = element.scrollTop;
      tmpCnt += element.scrollTop;
    });
    return tmpCnt > 0 ? positions : null;
  }

  setScrollPositions(html, positions) {
    html.find('[data-scrollable="true"]').each((i, element) => {
      const id = element.id || `scrollable-${i}`;
      if (positions?.[id] !== undefined) {
        element.scrollTop = positions[id];
      }
    });
  }
  /**
   * @override
   * ブックマーク帯への drop は、既に持っているものなら印を付けるだけ。
   */
  async _onDropItem(event, data) {
    if (!event.target.closest(".bookmark-drop-area")) {
      return super._onDropItem(event, data);
    }
    const droppedItem = await fromUuid(data.uuid ?? data.data?.uuid);
    if (droppedItem) await this._addBookmark(droppedItem);
  }

}
