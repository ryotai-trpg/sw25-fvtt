import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from "../helpers/effects.mjs";
import { powerRoll } from "../helpers/powerroll.mjs";
import { mpCost, hpCost } from "../helpers/mpcost.mjs";
import { lootRoll } from "../helpers/lootroll.mjs";
import { growthCheck } from "../helpers/growthcheck.mjs";
import { actionRoll } from "../helpers/actionroll.mjs";
import { targetRollDialog, targetSelectDialog } from "../helpers/dialogs.mjs";
import { SW25 } from "../helpers/config.mjs";
import { Util } from "../helpers/utils.mjs";
import { DamageSupporter } from "../helpers/damagesupport.mjs";
import {
  prepareItemContext,
  prepareColorSetting,
  prepareAbilityLabels,
  prepareActorEditors,
} from "../helpers/actor-context.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class SW25ActorSheet extends foundry.appv1.sheets.ActorSheet {
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html = $(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on("click", ".item-edit", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Open item details
    html.find(".item-label").click(this._showItemDetails.bind(this));
    html.find(".spelllist-label").click(this._showSpellList.bind(this));
    html.find(".spell-label").click(this._showSpellDetails.bind(this));
    html.find(".action-label").click(this._showActionDetails.bind(this));

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on("click", ".item-create", this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on("click", ".item-delete", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on("click", ".effect-control", (ev) => {
      const row = ev.currentTarget.closest("li");
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // exec Item Macro.
    html.on("click", ".execitemmacro", this._onItemMacro.bind(this));
    
    // Rollable abilities.
    html.on("click", ".rollable", this._onRoll.bind(this));

    // Rollable abilities for Power Roll.
    html.on("click", ".powerrollable", this._onPowerRoll.bind(this));

    // Roll request
    html.on("click", ".rollreq", this._onRollRequest.bind(this));

    // Apply effect.
    html.on("click", ".applyeffect", this._onApplyEffect.bind(this));

    // Mp cost.
    html.on("click", ".mpcost", this._onMpCost.bind(this));

    // Hp cost.
    html.on("click", ".hpcost", this._onHpCost.bind(this));

    // Resource cost.
    html.on("click", ".resourcecost", this._onResourceCost.bind(this));

    // Loot roll.
    html.on("click", ".lootrollable", this._onLootRoll.bind(this));

    // use Phasearea.
    html.on("click", ".usephasearea", this._onUsePhasearea.bind(this));

    // Lifeline add.
    html.on("click", ".lifelineadd", this._onLifelineAdd.bind(this));

    // Lifeline reset.
    html.on("click", ".lifelinereset", this._onLifelineReset.bind(this));

    // Material card cost.
    html.on("click", ".materialcardcost", this._onMaterialcardCost.bind(this));

    // Notes get.
    html.on("click", ".notesget", this._onNotesGet.bind(this));

    // Notes cost.
    html.on("click", ".notescost", this._onNotesCost.bind(this));

    // Notes add cost.
    html.on("click", ".notesaddget", this._onNotesAddGet.bind(this));

    // Notes reset.
    html.on("click", ".notesreset", this._onNotesReset.bind(this));

    // Tacspower get.
    html.on("click", ".tacspowerget", this._onTacspowerGet.bind(this));

    // Tacspower cost.
    html.on("click", ".tacspowercost", this._onTacspowerCost.bind(this));

    // Tacspower reset.
    html.on("click", ".tacspowerreset", this._onTacspowerReset.bind(this));

    // Popularity roll.
    html.on("click", ".popularityrollable", this._onPopularityRoll.bind(this));

    // Preemptive roll.
    html.on("click", ".preemptiverollable", this._onPreEmptiveRoll.bind(this));

    // Change Permission.
    html.on("click", ".changepermission", this._onChangePermission.bind(this));

    // Change Permission.
    html.on("click", ".changebookmark", this._onChangeBookmark.bind(this));

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
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

    // Change Input Area
    html.on("change", ".qt-change", this._changeQuantity.bind(this));
    html.on("change", ".sl-change", this._changeSkillLevel.bind(this));
    html.on("change", ".sc-change", this._changeSkillMod.bind(this));
    html.on("change", ".cm-change", this._changeCheckMod.bind(this));
    html.on("change", ".cm1-change", this._changeCheckMod1.bind(this));
    html.on("change", ".cm2-change", this._changeCheckMod2.bind(this));
    html.on("change", ".cm3-change", this._changeCheckMod3.bind(this));
    html.on("change", ".pm-change", this._changePowerMod.bind(this));
    html.on("change", ".eq-change", this._changeEquip.bind(this));
    html.on("change", ".rd-change", this._changeReading.bind(this));
    html.on("change", ".cv-change", this._changeConversation.bind(this));

    // Change Button
    html.find(".adjustment-button").click(this._onAdjustmentButton.bind(this));
    html.find(".quantity-button").click(this._onQuantityButton.bind(this));
    html.find(".changesl-button").click(this._onSkilllevelButton.bind(this));
    html.find(".checkmod-button").click(this._onCheckmodButton.bind(this));
    html.find(".roll-ability-check").click(this._onGrowthCheck.bind(this));
    html.find(".roll-actiontable").click(this._onActionTable.bind(this));

    // Drag action item to table
    html.find(`.actiontable`).on("drop", this._onActionTableDrag.bind(this));

    // Fairy contract check
    html.find(".fairy-contract").on("click", async (ev) => {
      const target = ev.currentTarget;
      const dataPath = target.dataset.path;
      const currentState =
        foundry.utils.getProperty(this.actor, dataPath) || false;

      await this.actor.update({ [dataPath]: !currentState });
      target.classList.toggle("checked", !currentState);
    });

    const dropArea = html.find(".bookmark-drop-area");
    if (dropArea.length > 0) {
      dropArea.on("drop", this._onBookmarkDrop.bind(this));
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = foundry.utils.duplicate(header.dataset);
    // Initialize a default name.
    const name = game.i18n.format("DOCUMENT.New", {
      type: game.i18n.localize(`TYPES.Item.${type}`),
    });
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemMacro(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const itemId =
      dataset.itemid ??
      event.currentTarget.closest("[data-item-id]")?.dataset.itemId ??
      null;
      
    // Handle item macro.
    const item = this.actor.items.get(itemId);
    if (!item) return;
    item.executeMacro(event);
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    const targetTokens = game.user.targets;
    if (dataset.apply == "-" || !dataset.apply || targetTokens.size === 0) {
      await this._onRollExec(event);
      return;
    } else {
      let label = dataset.label ? `${dataset.label}` : "";
      const targetRoll = await targetRollDialog(targetTokens, label);
      if (targetRoll == "cancel") {
        return;
      } else if (targetRoll == "once") {
        await this._onRollExec(event, targetTokens);
        return;
      } else if (targetRoll == "individual") {
        let chatMessageId = [];
        for (const [index, token] of Array.from(targetTokens).entries()) {
          const targetToken = new Set([token]);
          await this._onRollExec(event, targetToken).then((result) => {
            chatMessageId.push(result.chatMessageId);
          });
        }

        // rendar apply all message
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const checktype = dataset.checktype ? dataset.checktype.split(",") : "";
        let chatData = {
          speaker: speaker,
          flavor: `${label} - <b>${game.i18n.localize("SW25.Applyall")}</b>`,
        };
        chatData.flags = {
          sw25: {
            targetMessage: chatMessageId,
          },
        };
        chatData.content = await foundry.applications.handlebars.renderTemplate(
          "systems/sw25/templates/roll/roll-applyall.hbs",
          {
            apply: dataset.apply,
            checktype: checktype,
          }
        );

        ChatMessage.create(chatData);
        return;
      }
    }

    await this._onRollExec(event);
  }
  async _onRollExec(event, targetTokens) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const itemId =
      dataset.itemid ??
      event.currentTarget.closest("[data-item-id]")?.dataset.itemId ??
      null;
      
    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == "item") {
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      const rollData = this.actor.getRollData();
      const checktype = dataset.checktype ? dataset.checktype.split(",") : "";

      let roll = new Roll(dataset.roll, rollData);
      await roll.evaluate();

      let label = dataset.label ? `${dataset.label}` : "";

      let chatresuse;
      if (dataset.resuse) {
        const resuseid = dataset.resuse;
        const resusequantity = dataset.resusequantity;
        const resuseitem = this.actor.items.get(resuseid);
        const resuseitemquantity = resuseitem.system.quantity;
        const remainingquantity = resuseitemquantity - resusequantity;
        const min = resuseitem.system.qmin;

        if (resuseitem) {
          if (resuseitemquantity < resusequantity) {
            ui.notifications.warn(
              game.i18n.localize("SW25.Item.Noresquantitiywarn") +
                resuseitem.name
            );
            return;
          }
          if (remainingquantity < min) {
            ui.notifications.warn(
              game.i18n.localize("SW25.Item.Noresquantitiywarn") +
                resuseitem.name
            );
            return;
          }
          resuseitem.update({ "system.quantity": remainingquantity });
          chatresuse = `<div style="text-align: right;">${resuseitem.name}: ${resuseitemquantity} >>> ${remainingquantity}</div>`;
        }
      }

      const messageMode = game.settings.get("core", "messageMode");
      let chatData = {
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rolls: [roll],
      };

      let chatCritical = null;
      let chatFumble = null;
      if (roll.terms[0].total == 12) chatCritical = 1;
      if (roll.terms[0].total == 2) chatFumble = 1;

      let chatapply = dataset.apply;
      let chatspell = dataset.spell;

      // when selected target
      let target = null;
      let targetName = null;
      if (targetTokens) {
        const targetArray = Array.from(targetTokens);
        target = targetArray.map((target) => target.id);
        let targetNames = targetArray.map((target) => target.document.name);
        targetName = ``;
        for (let i = 0; i < targetNames.length; i++) {
          if (i != 0) targetName = targetName + `<br>`;
          targetName = targetName + `>>> ${targetNames[i]}`;
        }
        targetName = targetName + ``;
      }

      let resistData = null;
      if (dataset.resist && dataset.resistresult != "none") {
        resistData = {
          name: dataset.resist,
          result: dataset.resistresult,
        };
      }

      const item = itemId ? this.actor.items.get(itemId) : null;
      const elements = item ? item.system.elements : null;
      const damage = this.actor ? this.actor.system.attributes.damage : null;
      const classType = this.actor ? this.actor.system.classType : null;
      const isWeapon = DamageSupporter.getWeaponAttributes(item);
      const tags = DamageSupporter.createChatTag(elements, damage, classType, isWeapon);
      
      chatData.flags = {
        sw25: {
          total: roll.total,
          orgtotal: roll.total,
          formula: roll.formula,
          rolls: roll,
          tooltip: await roll.getTooltip(),
          apply: chatapply,
          spell: chatspell,
          checktype: checktype,
          target,
          targetName: targetName,
          resist: resistData,
          elements: elements,
          damage: damage,
          tags: tags,
        },
      };

      chatData.content = await foundry.applications.handlebars.renderTemplate(
        "systems/sw25/templates/roll/roll-check.hbs",
        {
          formula: roll.formula,
          tooltip: await roll.getTooltip(),
          critical: chatCritical,
          fumble: chatFumble,
          total: roll.total,
          apply: chatapply,
          spell: chatspell,
          checktype: checktype,
          resusetext: chatresuse,
          targetName: targetName,
          resist: resistData,
          tags: tags,
        }
      );

      let chatMessageId;
      await ChatMessage.create(chatData, { messageMode }).then((chatMessage) => {
        chatMessageId = chatMessage.id;
      });

      return { roll, chatMessageId };
    }
  }

  /**
   * Handle clickable power rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onPowerRoll(event) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    const targetTokens = game.user.targets;
    if (dataset.apply == "-" || !dataset.apply || targetTokens.size === 0) {
      await this._onPowerRollExec(event);
      return;
    } else {
      let label = dataset.label ? `${dataset.label}` : "";
      const targetRoll = await targetRollDialog(targetTokens, label);
      if (targetRoll == "cancel") {
        return;
      } else if (targetRoll == "once") {
        await this._onPowerRollExec(event, targetTokens);
        return;
      } else if (targetRoll == "individual") {
        let chatMessageId = [];
        for (const [index, token] of Array.from(targetTokens).entries()) {
          const targetToken = new Set([token]);
          await this._onPowerRollExec(event, targetToken).then((result) => {
            chatMessageId.push(result.chatMessageId);
          });
        }

        // rendar apply all message
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const powertype = dataset.powertype ? dataset.powertype.split(",") : "";
        let chatData = {
          speaker: speaker,
          flavor: `${label} - <b>${game.i18n.localize("SW25.Applyall")}</b>`,
        };
        chatData.flags = {
          sw25: {
            targetMessage: chatMessageId,
          },
        };
        chatData.content = await foundry.applications.handlebars.renderTemplate(
          "systems/sw25/templates/roll/roll-applyall.hbs",
          {
            apply: dataset.apply,
            powertype: powertype,
          }
        );

        ChatMessage.create(chatData);
        return;
      }
    }

    await this._onPowerRollExec(event);
  }
  async _onPowerRollExec(event, targetTokens) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const itemId =
      dataset.itemid ??
      event.currentTarget.closest("[data-item-id]")?.dataset.itemId ??
      null;
    const formula = dataset.roll;
    const powertype = dataset.powertype ? dataset.powertype.split(",") : "";
    const powertable = dataset.pt.split(",");
    //const powertable = dataset.pt.split(",").map(Number);
    let roll = await powerRoll(formula, powertable);

    const chatLabel = `${dataset.label}`;
    let cValueFormula = "@" + roll.cValue;
    let halfFormula = "";
    let lethalTechFormula = "";
    let criticalRayFormula = "";
    let pharmToolFormula = "";
    let powupFormula = "";
    if (roll.cValue == 100) cValueFormula = "@13";
    if (roll.halfPow == 1) halfFormula = "h+" + roll.halfPowMod;
    else if (roll.halfPowMod && roll.halfPowMod != 0)
      halfFormula = "+" + roll.halfPowMod;
    if (roll.lethalTech != 0) lethalTechFormula = "#" + roll.lethalTech;
    if (roll.criticalRay > 0) criticalRayFormula = "$+" + roll.criticalRay;
    else if (roll.criticalRay != 0) criticalRayFormula = "$" + roll.criticalRay;
    if (roll.pharmTool != 0) pharmToolFormula = "tf" + roll.pharmTool;
    if (roll.powup != 0) powupFormula = "r" + roll.powup;

    let chatFormula =
      "k" +
      roll.power +
      cValueFormula +
      "+" +
      roll.powMod +
      lethalTechFormula +
      criticalRayFormula +
      pharmToolFormula +
      powupFormula +
      halfFormula;

    let chatPower = roll.power;
    let chatLethalTech = null;
    let chatCriticalRay = null;
    let chatPharmTool = null;
    let chatPowup = null;
    let chatResult = roll.eachPowerResult;
    let chatMod = roll.powMod;
    let chatModTotal = roll.powMod;
    if (roll.halfPow == 0 && roll.halfPowMod && roll.halfPowMod != 0)
      chatModTotal += roll.halfPowMod;
    let chatHalf = null;
    let chatResults = roll.rawPowerResult;
    let chatTotal = roll.powerResult;
    let chatExtraRoll = null;
    let chatFumble = null;
    if (roll.halfPow == 1) chatHalf = roll.halfPowMod;
    if (roll.lethalTech != 0) chatLethalTech = roll.lethalTech;
    if (roll.criticalRay != 0) chatCriticalRay = roll.criticalRay;
    if (roll.pharmTool != 0) chatPharmTool = roll.pharmTool;
    if (roll.powup != 0) chatPowup = roll.powup;
    if (roll.rollCount > 0) chatExtraRoll = roll.rollCount;
    if (roll.fumble == 1) chatFumble = roll.fumble;

    const messageMode = game.settings.get("core", "messageMode");
    let chatData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: chatLabel,
      rolls: [roll.fakeResult],
    };

    let showhalf = true;
    let shownoc = true;
    if (roll.halfPow == 1) {
      showhalf = false;
      shownoc = false;
    }
    if (roll.cValue == 100 || chatExtraRoll == null) shownoc = false;
    let chatapply = dataset.apply;

    // when selected target
    let target = null;
    let targetName = null;
    if (targetTokens) {
      const targetArray = Array.from(targetTokens);
      target = targetArray.map((target) => target.id);
      let targetNames = targetArray.map((target) => target.document.name);
      targetName = ``;
      for (let i = 0; i < targetNames.length; i++) {
        if (i != 0) targetName = targetName + `<br>`;
        targetName = targetName + `>>> ${targetNames[i]}`;
      }
      targetName = targetName + ``;
    }

    const item = itemId ? this.actor.items.get(itemId) : null;
    const elements = item ? item.system.elements : null;
    const damage = this.actor ? this.actor.system.attributes.damage : null;
    const classType = this.actor ? this.actor.system.classType : null;
    const isWeapon = DamageSupporter.getWeaponAttributes(item);
    const tags = DamageSupporter.createChatTag(elements, damage, classType, isWeapon);

    chatData.flags = {
      sw25: {
        formula: chatFormula,
        tooltip: await roll.fakeResult.getTooltip(),
        power: chatPower,
        lethalTech: chatLethalTech,
        criticalRay: chatCriticalRay,
        pharmTool: chatPharmTool,
        powup: chatPowup,
        result: chatResult,
        mod: chatMod,
        modTotal: chatModTotal,
        half: chatHalf,
        results: chatResults,
        total: chatTotal,
        extraRoll: chatExtraRoll,
        fumble: chatFumble,
        orghalf: roll.halfPowMod,
        orgtotal: chatTotal,
        orgextraRoll: chatExtraRoll,
        showhalf: showhalf,
        shownoc: shownoc,
        apply: chatapply,
        powertype: powertype,
        target,
        targetName: targetName,
        elements: elements,
        damage: damage,
        tags: tags,
      },
    };
    
    chatData.content = await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/roll-power.hbs",
      {
        formula: chatFormula,
        tooltip: await roll.fakeResult.getTooltip(),
        power: chatPower,
        lethalTech: chatLethalTech,
        criticalRay: chatCriticalRay,
        pharmTool: chatPharmTool,
        powup: chatPowup,
        result: chatResult,
        mod: chatModTotal,
        half: chatHalf,
        results: chatResults,
        total: chatTotal,
        extraRoll: chatExtraRoll,
        fumble: chatFumble,
        showhalf: showhalf,
        shownoc: shownoc,
        apply: chatapply,
        powertype: powertype,
        targetName: targetName,
        tags: tags,
      }
    );

    let chatMessageId;
    await ChatMessage.create(chatData, { messageMode }).then((chatMessage) => {
      chatMessageId = chatMessage.id;
    });

    return { roll, chatMessageId };
  }

  async _onApplyEffect(event) {
    event.preventDefault();
    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    const orgActor = this.actor.name;
    const orgId = this.actor._id;
    const targetEffects = item.effects;
    const targetActorName = [];
    const transferEffectName = [];
    const targetedToken = game.user.targets;

    // if no target,show dialog
    if (!item.system.selfbuff && targetedToken.size === 0) {
      const title = `${item.name} (${game.i18n.localize("SW25.Effectslong")})`;
      const selectedTokens = await targetSelectDialog(title);
      selectedTokens.forEach((token) => game.user.targets.add(token));
      if (!selectedTokens) {
        return;
      }
    }

    // Effect name stock for chat message
    targetEffects.forEach((effect) => {
      const effectName = effect.name;
      transferEffectName.push({ effectName });
    });

    // Apply
    const targetTokens = game.user.targets;
    let targetTokenId = Array.from(targetTokens, (target) => target.id);

    // Target Actor
    let targetActors = [];
    if (item.system.selfbuff) {
      if (game.user.isGM) {
        const actorName = this.actor.name;
        targetActorName.push({ actorName });
        targetActors.push(this.actor);
      } else {
        const actorName = this.actor.name;
        targetActorName.push({ actorName });
        targetTokenId = this.actor.token
          ? this.actor.token.id
          : [this.actor.getActiveTokens()[0]?.id];
      }
    } else {
      targetedToken.forEach((token) => {
        targetActors.push(token.actor);

        // Actor name stock for chat message
        const actorName = token.actor.name;
        targetActorName.push({ actorName });
      });
      targetTokenId = Array.from(targetTokens, (target) => target.id);
    }

    if (game.user.isGM) {
      targetActors.forEach((targetActor) => {
        targetEffects.forEach((effect) => {
          const transferEffect = foundry.utils.duplicate(effect);
          transferEffect.disabled = false;
          transferEffect.sourceName = orgActor;
          transferEffect.flags = {
            sw25: {
              sourceName: orgActor,
              sourceId: `Actor.${orgId}`,
            },
          };
          targetActor.createEmbeddedDocuments("ActiveEffect", [transferEffect]);
        });
      });
    } else {
      game.socket.emit("system.sw25", {
        method: "applyEffect",
        targetTokens: targetTokenId,
        targetEffects: targetEffects,
        orgActor: orgActor,
        orgId: orgId,
      });
    }

    // reset target
    game.user.targets.forEach((target) => target.setTarget(false));

    // Chat message
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    let label = game.i18n.localize("SW25.Effectslong");
    let chatActorName = "";
    let chatEffectName = "";

    for (let i = 0; i < targetActorName.length; i++) {
      chatActorName += ">>> " + targetActorName[i].actorName + "<br>";
    }
    for (let i = 0; i < transferEffectName.length; i++) {
      chatEffectName += transferEffectName[i].effectName + "<br>";
    }

    let chatData = {
      speaker: speaker,
      flavor: label,
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/effect-apply.hbs",
      {
        targetActorName: chatActorName,
        transferEffectName: chatEffectName,
      }
    );

    ChatMessage.create(chatData);
  }

  async _onMpCost(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const selectedTokens = await Util.getControlledActor(this.actor);

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }
    const token = selectedTokens[0];
    const cost = dataset.cost;
    const name = dataset.label;
    const type = dataset.type;
    const id = dataset.id;
    const meta = 1;

    if (id === token.actor.id && (type === "summon" || type === "return")){
      ui.notifications.warn(game.i18n.localize("SW25.SummonMpwarn"));
      return;
    }
    
    mpCost(token, cost, name, type, meta);
  }

  async _onHpCost(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const selectedTokens = await Util.getControlledActor(this.actor);

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }
    const token = selectedTokens[0];
    const cost = dataset.cost;
    const max = dataset.max;
    const name = dataset.label;
    const type = dataset.type;
    hpCost(token, cost, max, name, type);
  }

  async _onResourceCost(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });

    if (dataset.resuse) {
      const resuseid = dataset.resuse;
      const resusequantity = dataset.resusequantity;
      const resuseitem = this.actor.items.get(resuseid);
      const resuseitemquantity = resuseitem.system.quantity;
      const remainingquantity = resuseitemquantity - resusequantity;
      const min = resuseitem.system.qmin;

      if (resuseitem) {
        if (resuseitemquantity < resusequantity) {
          ui.notifications.warn(
            game.i18n.localize("SW25.Item.Noresquantitiywarn") + resuseitem.name
          );
          return;
        }
        if (remainingquantity < min) {
          ui.notifications.warn(
            game.i18n.localize("SW25.Item.Noresquantitiywarn") + resuseitem.name
          );
          return;
        }
        resuseitem.update({ "system.quantity": remainingquantity });

        let chatData = {
          speaker: speaker,
        };

        chatData.content = `<div style="text-align: right;">${resuseitem.name}: ${resuseitemquantity} >>> ${remainingquantity}</div>`;

        ChatMessage.create(chatData);
      }
    }
  }

  async _onLootRoll(event) {
    event.preventDefault();
    lootRoll(this.actor);
  }

  async _onRollRequest(event) {
    event.preventDefault();

    const dataset = event.currentTarget.dataset;
    const checkName = dataset.label;
    const inputName = "";
    const refAbility = "";
    const modifier = "";
    let targetValue = dataset.value;
    const method = "check";
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });

    if( checkName == game.i18n.localize("SW25.Monster.Return") ){
      targetValue = Number(targetValue) + 1;
    }

    const message = dataset.label+game.i18n.localize("SW25.Check")
    
    let chatData = {
      speaker: speaker,
      flavor: checkName,
    };
    chatData.flags = {
      sw25: {
        checkName: checkName,
        inputName: inputName,
        refAbility: refAbility,
        modifier: modifier,
        targetValue: targetValue,
        method: method,
      },
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/rollreq-card.hbs",
      {
        checkName: checkName,
        message: message,
        difficulty: game.i18n.localize("SW25.Difficulty"),
        targetValue: targetValue,
        mod: modifier,
      }
    );

    ChatMessage.create(chatData);
  }

  async _onPopularityRoll(event) {
    event.preventDefault();

    const actorId = this.actor.id;
    const actor = game.actors.get(actorId);

    let checkName = game.settings.get("sw25", "effectMKnowPC");
    let inputName = "";
    let refAbility = "";
    let modifier = "";
    let targetValue = 0;
    let method = "check";

    let isView = false;
    if (CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER <= actor.ownership.default) {
      isView = true;
    } else {
      await actor.update({"ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED});
    }

    let monsterName = isView
      ? this.actor.name
      : this.actor.system.udname
      ? this.actor.system.udname
      : game.i18n.localize("SW25.Monster.Unidentifiedmon");

    let typeName;
    const classType = this.actor.system.classType;
    const type = this.actor.system.type;

    if (!classType || classType === "Other") {
      typeName = type;
    } else {
      typeName = game.i18n.localize(`SW25.Actor.Class.${classType}`);
    }
    monsterName += `(${typeName})`;
    targetValue = this.actor.system.popularity;
    targetValue += !isNaN(Number(this.actor.system.weakpoint))
      ? "/" + this.actor.system.weakpoint
      : "";

    let message = `${game.i18n.localize(
      "SW25.Monster.Popularity"
    )}/${game.i18n.localize("SW25.Monster.Weakpoint")}`;

    const speaker = isView
      ? ChatMessage.getSpeaker({ actor: this.actor })
      : ChatMessage.getSpeaker({ alias: "Gamemaster" });

    let chatData = {
      speaker: speaker,
      flavor: checkName,
    };
    chatData.flags = {
      sw25: {
        checkName: checkName,
        inputName: inputName,
        refAbility: refAbility,
        modifier: modifier,
        targetValue: targetValue,
        method: method,
      },
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/rollreq-card.hbs",
      {
        checkName: checkName,
        message: message,
        difficulty: `@UUID[Actor.${actorId}](${typeName})`,
        targetValue: targetValue,
        mod: modifier,
      }
    );

    ChatMessage.create(chatData);
  }

  async _onPreEmptiveRoll(event) {
    event.preventDefault();

    const actorId = this.actor.id;
    const actor = game.actors.get(actorId);

    let checkName = game.settings.get("sw25", "effectInitPC");
    let inputName = "";
    let refAbility = "";
    let modifier = "";
    let targetValue = 0;
    let method = "check";

    let isView = false;
    if (CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER <= actor.ownership.default) {
      isView = true;
    } else {
      await actor.update({"ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED});
    }

    let monsterName = isView
      ? this.actor.name
      : this.actor.system.udname
      ? this.actor.system.udname
      : game.i18n.localize("SW25.Monster.Unidentifiedmon");

    let typeName;
    const classType = this.actor.system.classType;
    const type = this.actor.system.type;

    if (!classType || classType === "Other") {
      typeName = type;
    } else {
      typeName = game.i18n.localize(`SW25.Actor.Class.${classType}`);
    }
    monsterName += `(${typeName})`;

    targetValue = this.actor.system.preemptive;
    let message = game.i18n.localize("SW25.Monster.Preemptive");

    const speaker = isView
      ? ChatMessage.getSpeaker({ actor: this.actor })
      : ChatMessage.getSpeaker({ alias: "Gamemaster" });

    let chatData = {
      speaker: speaker,
      flavor: checkName,
    };
    chatData.flags = {
      sw25: {
        checkName: checkName,
        inputName: inputName,
        refAbility: refAbility,
        modifier: modifier,
        targetValue: targetValue,
        method: method,
      },
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/rollreq-card.hbs",
      {
        checkName: checkName,
        message: message,
        difficulty: `@UUID[Actor.${actorId}](${typeName})`,
        targetValue: targetValue,
        mod: modifier,
      }
    );

    ChatMessage.create(chatData);
  }

  async _onChangePermission(event) {
    event.preventDefault();

    const actorId = this.actor.id;
    const actor = game.actors.get(actorId);
    if (
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER > this.actor.ownership.default
    ) {
      await actor.update({
        "ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
      });
    }

    const speaker = ChatMessage.getSpeaker({ actor: this.actor });

    let chatData = {
      speaker: speaker,
      flavor: game.i18n.localize("SW25.RevealMonsterData"),
    };
    chatData.flags = {};
    chatData.content = `@UUID[Actor.${this.actor.id}]`;

    ChatMessage.create(chatData);
  }

  async _showItemDetails(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents(".item");
    const description = item.find(".item-description");

    toggler.toggleClass("open", false);
    description.slideToggle();
  }

  async _showSpellList(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents(".item");
    const description = item.find(".spelllist-description");

    toggler.toggleClass("open", false);
    description.slideToggle();
  }

  async _showSpellDetails(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents(".spell");
    const description = item.find(".spell-description");

    toggler.toggleClass("open", false);
    description.slideToggle();
  }

  async _showActionDetails(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents(".action");
    const description = item.find(".action-description");

    toggler.toggleClass("open", false);
    description.slideToggle();
  }

  async _onAdjustmentButton(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const input = event.currentTarget.parentElement.querySelector("input");

    if (action === "decrease")
      isNaN(input.valueAsNumber) || !input.valueAsNumber
        ? (input.valueAsNumber = -1)
        : (input.valueAsNumber -= 1);
    else if (action === "increase")
      isNaN(input.valueAsNumber) || !input.valueAsNumber
        ? (input.valueAsNumber = 1)
        : (input.valueAsNumber += 1);

    this.submit();
  }

  async _onQuantityButton(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const input = event.currentTarget.closest("li").querySelector("input.qt-change");
    const property = this._itemProperty(event.currentTarget);
    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );

    let quantity = parseInt(input.value);
    if (isNaN(quantity)) quantity = 0;
    if (action === "decrease") quantity -= 1;
    else if (action === "increase") quantity += 1;

    // Check limit
    if (item.type == "resource") {
      if (item.system.qmax || item.system.qmax == 0) {
        if (item.system.qmax && quantity > item.system.qmax) {
          quantity = item.system.qmax;
          ui.notifications.warn(
            `"${item.name}"${game.i18n.localize("SW25.isAlreadyMax")}`
          );
        }
      }
      if (item.system.qmin || item.system.qmin == 0) {
        if (item.system.qmin && quantity < item.system.qmin) {
          quantity = item.system.qmin;
          ui.notifications.warn(
            `"${item.name}"${game.i18n.localize("SW25.isAlreadyMin")}`
          );
        }
      }
    }

    input.value = quantity;

    if (item) await item.update({ [property]: quantity });

    this.submit();
  }

  /**
   * ボタンの `data-property` はテンプレートのループ変数名込みで
   * `item.system.quantity` のように書かれている。実際の更新先は
   * その `item.` を除いた部分。
   *
   * 以前はこれをそのまま `item.update()` に渡していて、
   * スキーマに無いキーへの空打ちが 1 回入っていた
   * (本当の更新は直後の `_update*` が別に行っていた)。
   *
   * @param {HTMLElement} target `data-property` を持つ要素
   * @returns {string} `system.` から始まる更新先
   */
  _itemProperty(target) {
    return target.dataset.property?.replace(/^item\./, "");
  }

  async _changeQuantity(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newQuantity = Number(event.currentTarget.value);
    await this._updateQuantity(item, newQuantity);
  }

  async _updateQuantity(item, quantity) {
    await item.update({ "system.quantity": quantity });
  }

  async _onSkilllevelButton(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const input = event.currentTarget.closest("li").querySelector("input.sl-change");
    const property = this._itemProperty(event.currentTarget);
    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );

    let skilllevel = parseInt(input.value);
    if (isNaN(skilllevel)) skilllevel = 0;
    if (action === "decrease") skilllevel -= 1;
    else if (action === "increase") skilllevel += 1;

    input.value = skilllevel;

    if (item) await item.update({ [property]: skilllevel });

    this.submit();
  }

  async _changeSkillLevel(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newSkillLevel = Number(event.currentTarget.value);
    item.update({ "system.skilllevel": newSkillLevel });
  }

  async _changeSkillMod(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newSkillMod = Number(event.currentTarget.value);
    if (newSkillMod == 0) newSkillMod = null;
    item.update({ "system.skillmod": newSkillMod });
  }
  async _onCheckmodButton(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const input = event.currentTarget.closest("li").querySelector("input.cm-change");
    const property = this._itemProperty(event.currentTarget);
    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );

    let checkmod = parseInt(input.value);
    if (isNaN(checkmod)) checkmod = 0;
    if (action === "decrease") checkmod -= 1;
    else if (action === "increase") checkmod += 1;

    input.value = checkmod;

    if (item) await item.update({ [property]: checkmod });

    this.submit();
  }

  async _changeCheckMod(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newCheckMod = Number(event.currentTarget.value);
    if (newCheckMod == 0) newCheckMod = null;
    item.update({ "system.checkmod": newCheckMod });
  }

  async _changeCheckMod1(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newCheckMod = Number(event.currentTarget.value);
    if (newCheckMod == 0) newCheckMod = null;
    item.update({ "system.checkmod1": newCheckMod });
  }

  async _changeCheckMod2(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newCheckMod = Number(event.currentTarget.value);
    if (newCheckMod == 0) newCheckMod = null;
    item.update({ "system.checkmod2": newCheckMod });
  }

  async _changeCheckMod3(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newCheckMod = Number(event.currentTarget.value);
    if (newCheckMod == 0) newCheckMod = null;
    item.update({ "system.checkmod3": newCheckMod });
  }

  async _changePowerMod(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newPowerMod = Number(event.currentTarget.value);
    if (newPowerMod == 0) newPowerMod = null;
    item.update({ "system.powermod": newPowerMod });
  }

  async _changeEquip(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newEquip = event.currentTarget.checked;
    item.update({ "system.equip": newEquip });
  }

  async _changeReading(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newReading = event.currentTarget.checked;
    item.update({ "system.reading": newReading });
  }

  async _changeConversation(event) {
    event.preventDefault();

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let newConversation = event.currentTarget.checked;
    item.update({ "system.conversation": newConversation });
  }

  async _onGrowthCheck(event) {
    event.preventDefault();
    growthCheck(this.actor);
  }

  async _onActionTable(event) {
    event.preventDefault();
    const element = event.currentTarget;
    actionRoll(element, this.actor);
  }

  async _onActionTableDrag(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const data = JSON.parse(
      event.originalEvent.dataTransfer.getData("text/plain")
    );
    const item = await fromUuid(data.uuid);
    if (!item) return;
    if (item.type != "action") return;

    // set item data
    let updatedData = {};
    switch (dataset.area) {
      case "f17":
        updatedData = { "system.actiondice": "f1", "system.actionresult": "7" };
        break;
      case "f16":
        updatedData = { "system.actiondice": "f1", "system.actionresult": "6" };
        break;
      case "f38":
        updatedData = { "system.actiondice": "f3", "system.actionresult": "8" };
        break;
      case "f35":
        updatedData = { "system.actiondice": "f3", "system.actionresult": "5" };
        break;
      case "f59":
        updatedData = { "system.actiondice": "f5", "system.actionresult": "9" };
        break;
      case "f54":
        updatedData = { "system.actiondice": "f5", "system.actionresult": "4" };
        break;
      case "f610":
        updatedData = {
          "system.actiondice": "f6",
          "system.actionresult": "10",
        };
        break;
      case "f63":
        updatedData = { "system.actiondice": "f6", "system.actionresult": "3" };
        break;
      case "d18":
        updatedData = { "system.actiondice": "d1", "system.actionresult": "8" };
        break;
      case "d28":
        updatedData = { "system.actiondice": "d2", "system.actionresult": "8" };
        break;
      case "d49":
        updatedData = { "system.actiondice": "d4", "system.actionresult": "9" };
        break;
      case "d610":
        updatedData = {
          "system.actiondice": "d6",
          "system.actionresult": "10",
        };
        break;
      default:
        updatedData = {
          "system.actiondice": null,
          "system.actionresult": null,
        };
        break;
    }

    // update item data
    const ownedItem = this.actor.items.get(item.id);
    if (ownedItem) {
      await ownedItem.update(updatedData);
    } else {
      event.stopPropagation();
      const newItem = item.toObject();
      const createdItem = await this.actor.createEmbeddedDocuments("Item", [
        newItem,
      ]);
      await createdItem[0].update(updatedData);
    }
  }

  async _onUsePhasearea(event) {
    event.preventDefault();
    const selectedTokens = await Util.getControlledActor(this.actor);
    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    let cost = item.system.mincost ? item.system.mincost : 0;

    if (item.system.maxcost && item.system.mincost != item.system.maxcost) {
      this._inputUsePhaseareaCost(item);
    } else {
      this._applyPhasearea(item, cost);
    }
  }

  async _applyPhasearea(item, cost) {
    const selectedTokens = await Util.getControlledActor(this.actor);

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }

    const orgActor = this.actor.name;
    const orgId = this.actor._id;
    const name =
      item.name +
      game.i18n.localize("SW25.Use") +
      " " +
      cost +
      game.i18n.localize("SW25.Item.Phasearea.Point");
    let effects = [
      {
        name: name,
        img: item.img,
        origin: "Item." + item._id,
        disabled: false,
        changes: [],
        description: item.system.description,
        transfer: false,
        statuses: [],
        flags: {
          sw25: {
            sourceName: orgActor,
            sourceId: `Actor.${orgId}`,
          },
        },
        tint: null,
      },
    ];

    let lifeline = "";
    if (item.system.type == "ten") {
      lifeline = "Ten";
    } else if (item.system.type == "chi") {
      lifeline = "Chi";
    } else if (item.system.type == "jin") {
      lifeline = "Jin";
    }

    let resource = this.actor.items.find(
      (i) =>
        i.type === "resource" &&
        i.system?.resource?.type === "lifeline" &&
        i.system?.resource?.lifelinetype === item.system.type
    );

    if (!resource) {
      ui.notifications.warn(
        game.i18n.localize("SW25.NotResource") +
          ":" +
          game.i18n.localize(`SW25.Item.Phasearea.${lifeline}`)
      );
    } else {
      let oldVal = resource.system.quantity ? resource.system.quantity : 0;
      let newVal = oldVal - cost;

      await resource.update({ "system.quantity": newVal });
    }

    // Apply
    if (game.user.isGM) {
      selectedTokens[0].actor.createEmbeddedDocuments("ActiveEffect", effects);
    } else {
      const targetTokenId = Array.from(selectedTokens, (target) => target.id);
      game.socket.emit("system.sw25", {
        method: "applyEffect",
        targetTokens: targetTokenId,
        targetEffects: effects,
        orgActor: orgActor,
        orgId: orgId,
      });
    }

    // Chat message
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    let label = game.i18n.localize("SW25.Effectslong");
    let chatActorName = ">>> " + selectedTokens[0].actor.name + "<br>";
    let chatEffectName =
      effects[0].name +
      "(" +
      game.i18n.localize(`SW25.Item.Phasearea.${lifeline}`) +
      ")<br>";

    let chatData = {
      speaker: speaker,
      flavor: label,
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/effect-apply.hbs",
      {
        targetActorName: chatActorName,
        transferEffectName: chatEffectName,
      }
    );

    ChatMessage.create(chatData);
  }

  async _inputUsePhaseareaCost(item) {
    const title = game.i18n.localize("SW25.InputPhaseareaPoint");
    foundry.applications.api.DialogV2.wait({
      window: { title: `${title} (${item.name})` },
      content: `
        <div class="form-group">
          <label for="number">${title} (${item.system.mincost}-${item.system.maxcost})</label>
        </div>
        <div class="form-group">
          <input id="number" name="number" type="number" value="0" />
        </div>
      `,
      buttons: [
        {
          action: "ok",
          label: game.i18n.localize("SW25.Use"),
          default: true,
          callback: (event, button, dialog) => {
            const cost = parseInt(
              dialog.element.querySelector("#number")?.value
            );
            if (isNaN(cost)) {
              ui.notifications.error(
                game.i18n.localize("SW25.Item.Spell.Cancel")
              );
              return;
            }
            this._applyPhasearea(item, cost);
          },
        },
        {
          action: "cancel",
          label: game.i18n.localize("SW25.Item.Spell.Cancel"),
        },
      ],
    });
  }

  async _onMaterialcardCost(event) {
    event.preventDefault();
    const selectedTokens = await Util.getControlledActor(this.actor);

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );

    const useRank = event.target.textContent.trim().toLowerCase();
    const cards = [
      { color: "red", mark: "fa-paw" },
      { color: "green", mark: "fa-leaf" },
      { color: "black", mark: "fa-gem" },
      { color: "white", mark: "fa-heart" },
      { color: "gold", mark: "fa-sun" },
    ];
    let name = `${item.name}(${event.target.textContent.trim()})`;
    let materialcards = [];

    for (let card of cards) {
      if (!isNaN(item.system[card.color]) && item.system[card.color] <= 0) {
        continue;
      }

      let resource = this.actor.items.find(
        (i) =>
          i.type === "resource" &&
          i.system?.resource?.type === "material" &&
          i.system?.resource?.materialtype === card.color &&
          i.system?.resource?.materialrank === useRank
      );

      let name =
        game.i18n.localize(`SW25.Item.Alchemytech.${card.color.capitalize()}`) +
        event.target.textContent.trim();

      if (!resource) {
        materialcards.push({
          key: item.system[card.color],
          name: name,
          color: card.color,
          cost: item.system[card.color],
          resource: false,
          oldVal: null,
          newVal: null,
        });
      } else {
        let oldVal = resource.system.quantity ? resource.system.quantity : 0;
        let newVal = oldVal - item.system[card.color];

        await resource.update({ "system.quantity": newVal });

        materialcards.push({
          key: item.system[card.color],
          name: name,
          color: card.color,
          mark: card.mark,
          cost: item.system[card.color],
          resource: true,
          oldVal: oldVal,
          newVal: newVal,
        });
      }
    }

    // alchemitech effective change.
    if ((item.system.effectvalue?.type && item.system.effectvalue.type !== "-")
        && item.effects) {
      const changeValue = item.system.effectvalue[useRank];
      if (changeValue) {
        const updates = [];

        if (item.system.effectvalue.type === "diceformula") {
          await item.update({ "system.customformula": String(changeValue) });
        } else {
          for (let effect of item.effects) {
            const updateData = { _id: effect.id };

            if (item.system.effectvalue.type === "time") {
              updateData.duration = { rounds: Number(changeValue) };
            } else if (item.system.effectvalue.type === "value") {
              updateData.changes = effect.changes.map((c) => ({
                ...c,
                value: Number(changeValue),
              }));
            }

            updates.push(updateData);
          }
          await item.updateEmbeddedDocuments("ActiveEffect", updates);
        }
      }
    }

    // Chat message
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    let label =
      game.i18n.localize("SW25.Item.Alchemytech.MaterialCard") +
      game.i18n.localize("SW25.Cost");

    let chatData = {
      speaker: speaker,
      flavor: label,
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/card-apply.hbs",
      {
        name: name,
        materialcards: materialcards,
      }
    );

    ChatMessage.create(chatData);
  }

  async _onNotesGet(event) {
    event.preventDefault();
    const selectedTokens = await Util.getControlledActor(this.actor);

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );

    if (item.system.upget) {
      let resourceType = {
        type: "note",
        notetype: "up",
      };
      await this._updateResource(resourceType, item.system.upget);
    }
    if (item.system.downget) {
      let resourceType = {
        type: "note",
        notetype: "down",
      };
      await this._updateResource(resourceType, item.system.downget);
    }
    if (item.system.charmget) {
      let resourceType = {
        type: "note",
        notetype: "charm",
      };
      await this._updateResource(resourceType, item.system.charmget);
    }
  }

  async _onNotesCost(event) {
    event.preventDefault();
    const selectedTokens = await Util.getControlledActor(this.actor);

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );

    if (item.system.upcost) {
      let resourceType = {
        type: "note",
        notetype: "up",
      };
      await this._updateResource(resourceType, item.system.upcost, -1);
    }
    if (item.system.downcost) {
      let resourceType = {
        type: "note",
        notetype: "down",
      };
      await this._updateResource(resourceType, item.system.downcost, -1);
    }
    if (item.system.charmcost) {
      let resourceType = {
        type: "note",
        notetype: "charm",
      };
      await this._updateResource(resourceType, item.system.charmcost, -1);
    }
  }

  async _onNotesAddGet(event) {
    event.preventDefault();
    const selectedTokens = await Util.getControlledActor(this.actor);

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );

    if (item.system.upadd) {
      let resourceType = {
        type: "note",
        notetype: "up",
      };
      await this._updateResource(resourceType, item.system.upadd);
    }
    if (item.system.downadd) {
      let resourceType = {
        type: "note",
        notetype: "down",
      };
      await this._updateResource(resourceType, item.system.downadd);
    }
    if (item.system.charmadd) {
      let resourceType = {
        type: "note",
        notetype: "charm",
      };
      await this._updateResource(resourceType, item.system.charmadd);
    }
  }

  async _onTacspowerGet(event) {
    event.preventDefault();
    const selectedTokens = await Util.getControlledActor(this.actor);

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );

    if (item.system.get) {
      let resourceType = {
        type: "tacspower",
      };
      await this._updateResource(resourceType, item.system.get);
    }
  }

  async _onTacspowerCost(event) {
    event.preventDefault();
    const selectedTokens = await Util.getControlledActor(this.actor);

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }

    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );

    if (item.system.cost) {
      let resourceType = {
        type: "tacspower",
      };
      await this._updateResource(resourceType, item.system.cost, -1);
    }
  }

  async _onNotesReset(event) {
    event.preventDefault();

    await this._updateAllResource({type: "note"}, null);
  }

  async _onLifelineReset(event) {
    event.preventDefault();

    await this._updateAllResource({type: "lifeline"}, null);
  }

  async _onLifelineAdd(event) {
    event.preventDefault();

    await this._updateAllResource({type: "lifeline"}, 1);
  }

  async _onTacspowerReset(event) {
    event.preventDefault();

    await this._updateAllResource({type: "tacspower"}, null);
  }

  async _updateResource(resourceType, modifyValue, multiple = 1) {
    const result = isNaN(Number(modifyValue))
      ? 0
      : Number(modifyValue) * multiple;

    let resource = this.actor.items.find((i) => {
      if (i.type !== "resource") return false;

      const res = i.system?.resource;
      return (
        res &&
        Object.entries(resourceType).every(([key, value]) => res[key] === value)
      );
    });

    if (resource) {
      let oldVal = resource.system.quantity ? resource.system.quantity : 0;
      let newVal = oldVal + Number(result);

      await resource.update({ "system.quantity": newVal });
    } else {
      ui.notifications.warn(game.i18n.localize("SW25.NotResource"));
      return;
    }
  }
  
  async _updateAllResource(resourceType, modifyValue, multiple = 1) {
    const result = isNaN(Number(modifyValue))
      ? 0
      : Number(modifyValue) * multiple;

    const resources = this.actor.items.filter((i) => {
      if (i.type !== "resource") return false;

      const res = i.system?.resource;
      return (
        res &&
        Object.entries(resourceType).every(([key, value]) => res[key] === value)
      );
    });

    if (resources.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.NotResource"));
      return;
    }

    const updates = resources.map(resource => {
      const oldVal = Number(resource.system.quantity ?? 0);
      const newVal = modifyValue ? oldVal + Number(result) : 0;
      return {
        _id: resource.id,
        system: {
          quantity: newVal
        }
      };
    });

    await this.actor.updateEmbeddedDocuments("Item", updates);
  }

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
  async _onBookmarkDrop(event) {
    event.preventDefault();

    const data = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
    if (data.type !== "Item") return;

    const droppedItem = await fromUuid(data.uuid ?? data.data?.uuid);
    if (!droppedItem) return;

    const droppedItemId = droppedItem.id;
    const droppedItemName = droppedItem.name;

    let ownedItem = this.actor.items.get(droppedItemId);

    if (ownedItem) {
      await ownedItem.update({ "system.bookmark": true });
    } else {
      const sameNameItem = this.actor.items.find(i => i.name === droppedItemName);

      if (sameNameItem) {
        await sameNameItem.update({ "system.bookmark": true });
      } else {
        const newItemData = foundry.utils.duplicate(droppedItem.toObject());
        newItemData.system.bookmark = true;

        await this.actor.createEmbeddedDocuments("Item", [newItemData]);
      }
    }
  }

  async _onDropItem(event, data) {
    const isBookmarkDrop = event.target.closest(".bookmark-drop-area");
    if (!isBookmarkDrop) {
      return super._onDropItem(event, data);
    }

    const droppedItem = await fromUuid(data.uuid ?? data.data?.uuid);
    if (!droppedItem) return;

    const droppedItemId = droppedItem.id;
    const droppedItemName = droppedItem.name;

    let ownedItem = this.actor.items.get(droppedItemId);

    if (ownedItem) {
      await ownedItem.update({ "system.bookmark": true });
    } else {
      const sameNameItem = this.actor.items.find(i => i.name === droppedItemName);

      if (sameNameItem) {
        await sameNameItem.update({ "system.bookmark": true });
      } else {
        const newItemData = foundry.utils.duplicate(droppedItem.toObject());
        newItemData.system.bookmark = true;

        await this.actor.createEmbeddedDocuments("Item", [newItemData]);
      }
    }

    return;
  }

  async _onChangeBookmark(event) {
    event.preventDefault();
    const changeItem = $(event.currentTarget);
    const item = this.actor.items.get(
      changeItem.parents(".item")[0].dataset.itemId
    );
    item.update({ "system.bookmark": !item.system.bookmark });
  }

}
