import { prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { bindTextareaEditors } from "../helpers/textarea-editor.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * アクターシートとアイテムシートで共通の土台。
 *
 * ApplicationV2 の `DEFAULT_OPTIONS` と `actions` は継承チェーンでマージされるので
 * ここに置いたものはサブクラスへ降りる。**`PARTS` と `TABS` はマージされない**ので、
 * 具象シートが毎回すべて宣言する(本体の HandlebarsApplicationMixin の仕様)。
 *
 * @param {typeof foundry.applications.api.ApplicationV2} base
 */
export const SW25DocumentSheetMixin = (base) =>
  class SW25DocumentSheet extends HandlebarsApplicationMixin(base) {
    /** @override */
    static DEFAULT_OPTIONS = {
      classes: ["sw25"],
      window: { resizable: true },
      form: { submitOnChange: true },
      actions: {
        effectCreate: this.#onEffectCreate,
        effectEdit: this.#onEffectEdit,
        effectDelete: this.#onEffectDelete,
        effectToggle: this.#onEffectToggle,
      },
    };

    /* -------------------------------------------- */
    /*  Context                                     */
    /* -------------------------------------------- */

    /**
     * `system` には **`toObject(false)` ではなく実体**を渡す。
     *
     * V1 シートは `document.toObject(false)` でコンテキストを作っており、
     * `SchemaField#toObject` が宣言済みフィールドしか回さないため
     * 「実行時に生えた派生値がシート上で空になる」制約があった。
     * ApplicationV2 の `DocumentSheetV2#_prepareContext` は
     * `document` / `source`(= `_source`) / `fields` を渡すだけで toObject を通さないので、
     * ここで実体を渡せばその制約は掛からない。
     *
     * 実体を渡す積極的な理由もある — `system.skilllist` は技能アイテム(Document)の配列で、
     * deepClone を通すと壊れる(Phase 2 で確認済み)。
     *
     * ただし**書き込み側の制約は変わらない**。DataModel は未宣言の `system.*` を
     * 黙って捨てるので、シートが送るフィールドは必ずスキーマに要る(検証ゲート A)。
     */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const doc = this.document;

      Object.assign(context, {
        system: doc.system,
        systemFields: doc.system.schema.fields,
        flags: doc.flags,
        config: CONFIG.SW25,
        owner: doc.isOwner,
        limited: doc.limited,
        isGM: game.user.isGM,
        // 編集モードは従来どおり保存されるデータ(`system.isEdit`)。
        // 24 型すべての DataModel と character が既に宣言していて、
        // ワールドにも値が入っているので、シート側の状態には移していない。
        // テンプレートが 1 つの名前で読めるようコンテキストにも出す
        isEdit: Boolean(doc.system.isEdit),
        effects: prepareActiveEffectCategories(doc.effects),
      });

      return context;
    }

    /**
     * タブと PART の対応付け。
     *
     * 本体の `_preparePartContext` は `partId` を積むだけなので、
     * `{{tab.cssClass}}` / `{{tab.id}}` を使うために各シートで書く必要がある。
     * PART の id とタブの id を揃える約束にして、ここで一度だけ配る。
     */
    async _preparePartContext(partId, context, options) {
      await super._preparePartContext(partId, context, options);
      if (context.tabs && partId in context.tabs) context.tab = context.tabs[partId];
      return context;
    }

    /**
     * タブ設定の組み立て。
     *
     * ラベルは既存の翻訳キーをそのまま使う(`labelPrefix` は使わない)。
     * `SW25.Description` などは V1 シートが既に使っているキーで、
     * タブのためだけに `SW25.Sheet.TABS.*` を作ると同じ語の重複になる。
     *
     * @param {...string} ids PART の id と揃えたタブ id
     */
    static tabs(...ids) {
      return {
        primary: {
          tabs: ids.map((id) => ({ id, label: this.TAB_LABELS[id] })),
          initial: ids[0],
        },
      };
    }

    /** タブ id → 既存の翻訳キー */
    static TAB_LABELS = {
      description: "SW25.Description",
      details: "SW25.Details",
      effects: "SW25.Effects",
      customs: "SW25.Customs",
    };

    /* -------------------------------------------- */
    /*  Render                                      */
    /* -------------------------------------------- */

    /** @override */
    async _onRender(context, options) {
      await super._onRender(context, options);

      // V1 では sw25.mjs の `renderSW25ItemSheet` / `renderSW25ActorSheet` フックが
      // 張っていた。ApplicationV2 のフック名はクラス名の連鎖から作られるので
      // (`Application#_doEvent` → `#callHooks`)、V2 のシートにはあのフックは飛ばない。
      // シート側の責務としてここで張り直す
      bindTextareaEditors(this.element, this.document);
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    /**
     * 行から ActiveEffect を引く。`data-effect-id` を持つ祖先を辿る。
     * @param {HTMLElement} target
     * @returns {ActiveEffect|undefined}
     */
    _effectFromTarget(target) {
      const id = target.closest("[data-effect-id]")?.dataset.effectId;
      return id ? this.document.effects.get(id) : undefined;
    }

    static async #onEffectCreate(event, target) {
      const type = target.closest("[data-effect-type]")?.dataset.effectType;
      await this.document.createEmbeddedDocuments("ActiveEffect", [
        {
          name: game.i18n.format("DOCUMENT.New", {
            type: game.i18n.localize("DOCUMENT.ActiveEffect"),
          }),
          img: "icons/svg/aura.svg",
          origin: this.document.uuid,
          "duration.rounds":
            type === "temporary" || type === "inactive" ? 1 : undefined,
          disabled: type === "inactive",
        },
      ]);
    }

    static async #onEffectEdit(event, target) {
      await this._effectFromTarget(target)?.sheet.render(true);
    }

    // 確認を挟まないのは V1 と同じ(移行では挙動を変えない)
    static async #onEffectDelete(event, target) {
      await this._effectFromTarget(target)?.delete();
    }

    static async #onEffectToggle(event, target) {
      const effect = this._effectFromTarget(target);
      if (effect) await effect.update({ disabled: !effect.disabled });
    }
  };
