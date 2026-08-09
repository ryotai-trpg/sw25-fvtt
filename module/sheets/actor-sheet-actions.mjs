import { onManageActiveEffect } from "../helpers/effects.mjs";
import { powerRoll } from "../helpers/powerroll.mjs";
import { createPowerCard } from "../helpers/rollcard.mjs";
import { mpCost, hpCost } from "../helpers/mpcost.mjs";
import { lootRoll } from "../helpers/lootroll.mjs";
import { growthCheck } from "../helpers/growthcheck.mjs";
import { actionRoll } from "../helpers/actionroll.mjs";
import { targetSelectDialog } from "../helpers/dialogs.mjs";
import { rollWithTargets } from "../helpers/targetroll.mjs";
import { Util, slideToggle, slideUp } from "../helpers/utils.mjs";
import { DamageSupporter } from "../helpers/damagesupport.mjs";

/**
 * アクターシートの操作。`actor-sheet-V2.mjs` の 3 型に被せる。
 *
 * ハンドラは ApplicationV2 の action と同じ `(event, target)` で受ける。
 * `target` は「押された要素」で、委譲リスナが `closest()` で拾ったもの。
 * `this` に求めるのは `actor` / `submit()` / `render()` の 3 つだけ。
 *
 * @param {typeof foundry.applications.api.ApplicationV2} base
 */
export const SW25ActorActionsMixin = (base) =>
  class SW25ActorActions extends base {
    /* -------------------------------------------- */
    /*  どのクラスに何を張るか                       */
    /* -------------------------------------------- */

    /**
     * クリックで呼ぶもの。閲覧だけでも動く。
     *
     * ApplicationV2 の `data-action` へ振り直していないのは、
     *   - 対象が 48 本の partial に散らばった約 800 要素あること
     *   - `.quantity-button` などが `data-action="increase|decrease"` を
     *     **別の意味で**既に使っていること
     * の 2 つによる。
     */
    static VIEW_CLICKS = {
      ".item-edit": "_onItemEdit",
      ".item-label": "_showItemDetails",
      ".spelllist-label": "_showSpellList",
      ".spell-label": "_showSpellDetails",
      ".action-label": "_showActionDetails",
    };

    /** クリックで呼ぶもの。編集できるときだけ */
    static EDIT_CLICKS = {
      ".item-create": "_onItemCreate",
      ".item-delete": "_onItemDelete",
      ".effect-control": "_onEffectControl",
      ".execitemmacro": "_onItemMacro",
      ".rollable": "_onRoll",
      ".powerrollable": "_onPowerRoll",
      ".rollreq": "_onRollRequest",
      ".applyeffect": "_onApplyEffect",
      ".mpcost": "_onMpCost",
      ".hpcost": "_onHpCost",
      ".resourcecost": "_onResourceCost",
      ".lootrollable": "_onLootRoll",
      ".usephasearea": "_onUsePhasearea",
      ".lifelineadd": "_onLifelineAdd",
      ".lifelinereset": "_onLifelineReset",
      ".materialcardcost": "_onMaterialcardCost",
      ".notesget": "_onNotesGet",
      ".notescost": "_onNotesCost",
      ".notesaddget": "_onNotesAddGet",
      ".notesreset": "_onNotesReset",
      ".tacspowerget": "_onTacspowerGet",
      ".tacspowercost": "_onTacspowerCost",
      ".tacspowerreset": "_onTacspowerReset",
      ".popularityrollable": "_onPopularityRoll",
      ".preemptiverollable": "_onPreEmptiveRoll",
      ".changepermission": "_onChangePermission",
      ".changebookmark": "_onChangeBookmark",
      ".adjustment-button": "_onAdjustmentButton",
      ".quantity-button": "_onQuantityButton",
      ".changesl-button": "_onSkilllevelButton",
      ".checkmod-button": "_onCheckmodButton",
      ".roll-ability-check": "_onGrowthCheck",
      ".roll-actiontable": "_onActionTable",
      ".fairy-contract": "_onFairyContract",
    };

    /** 入力の change で呼ぶもの。どれもアイテム側を直接書き換える */
    static EDIT_CHANGES = {
      ".qt-change": "_changeQuantity",
      ".sl-change": "_changeSkillLevel",
      ".sc-change": "_changeSkillMod",
      ".cm-change": "_changeCheckMod",
      ".cm1-change": "_changeCheckMod1",
      ".cm2-change": "_changeCheckMod2",
      ".cm3-change": "_changeCheckMod3",
      ".pm-change": "_changePowerMod",
      ".eq-change": "_changeEquip",
      ".rd-change": "_changeReading",
      ".cv-change": "_changeConversation",
    };

    /* -------------------------------------------- */
    /*  行から Document を引く                       */
    /* -------------------------------------------- */

    /**
     * 押された要素の属するアイテム行から Item を引く。
     * @param {HTMLElement} target
     * @returns {Item|undefined}
     */
    _itemFromTarget(target) {
      const id = target.closest("[data-item-id]")?.dataset.itemId;
      return id ? this.actor.items.get(id) : undefined;
    }

    /* -------------------------------------------- */
    /*  アイテム行の開閉                             */
    /* -------------------------------------------- */

    /**
     * 説明の開閉。
     *
     * @param {HTMLElement} target 押された見出し
     * @param {string} rowSelector 行を探すセレクタ
     * @param {string} descSelector 開閉する説明のセレクタ
     */
    _toggleDescription(target, rowSelector, descSelector) {
      const row = target.closest(rowSelector);
      const description = row?.querySelector(descSelector);
      target.classList.remove("open");
      if (description) slideToggle(description);
    }

    /* -------------------------------------------- */
    /*  アイテムとバフの操作                         */
    /* -------------------------------------------- */

    /** アイテムのシートを開く */
    async _onItemEdit(event, target) {
      await this._itemFromTarget(target)?.sheet.render(true);
    }

    /** アイテムを消す。行を畳んでから消す(V1 と同じ見せ方) */
    async _onItemDelete(event, target) {
      const item = this._itemFromTarget(target);
      if (!item) return;
      const row = target.closest(".item");
      await item.delete();
      if (row) await slideUp(row, 200);
      this.render(false);
    }

    /**
     * バフの作成・切り替え・編集・削除。
     *
     * アクターのシートはアイテムのバフも並べるので、行の
     * `data-parent-id` が指す Document へ向ける。
     * `data-action` の値(create / toggle / edit / delete)は
     * `parts/actor-effects.hbs` が持っている。
     */
    async _onEffectControl(event, target) {
      const row = target.closest("[data-parent-id]");
      const parentId = row?.dataset.parentId;
      const document =
        parentId === this.actor.id ? this.actor : this.actor.items.get(parentId);
      if (document) onManageActiveEffect(event, document, target);
    }

    /** 妖精との契約。`data-path` の真偽を反転する */
    async _onFairyContract(event, target) {
      const dataPath = target.dataset.path;
      const currentState = foundry.utils.getProperty(this.actor, dataPath) || false;
      await this.actor.update({ [dataPath]: !currentState });
      target.classList.toggle("checked", !currentState);
    }

    /* -------------------------------------------- */
    /*  ここから下は V1 からそのまま移したもの        */
    /* -------------------------------------------- */

    async _onItemCreate(event, target) {
      event.preventDefault();
      const header = target;
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
     * アイテム行のマクロ実行ボタン(`.execitemmacro`)。
     *
     * `Item#executeMacro` は Item Macro モジュール(`flags.itemacro.macro`)が
     * 生やすもので、本システムには無い。ボタンは
     * `flags.itemacro.macro.command` があるときだけ出るが、そのフラグは
     * モジュールを外してもワールドのデータに残るので、
     * モジュール抜きでボタンだけが出ている状態になりうる。
     *
     * @param {Event} event   The originating click event
     * @private
     */
    async _onItemMacro(event, target) {
      event.preventDefault();
      const element = target;
      const dataset = element.dataset;
      const itemId =
        dataset.itemid ??
        target.closest("[data-item-id]")?.dataset.itemId ??
        null;

      // Handle item macro.
      const item = this.actor.items.get(itemId);
      if (!item) return;
      if (typeof item.executeMacro !== "function") {
        ui.notifications.warn(game.i18n.localize("SW25.Itemmacrowarn"));
        return;
      }
      await item.executeMacro(event);
    }

    /**
     * Handle clickable rolls.
     * @param {Event} event   The originating click event
     * @private
     */
    async _onRoll(event, target) {
      const dataset = target.dataset;
      await rollWithTargets({
        actor: this.actor,
        label: dataset.label ? `${dataset.label}` : "",
        apply: dataset.apply,
        checktype: dataset.checktype ? dataset.checktype.split(",") : "",
        exec: (targetTokens) => this._onRollExec(event, target, targetTokens),
      });
    }
    async _onRollExec(event, element, targetTokens) {
      event.preventDefault();
      // ここでの `target` は「ロールの対象トークン」を指す既存の名前なので、
      // 押された要素のほうを `element` で受ける
      const dataset = element.dataset;
      const itemId =
        dataset.itemid ??
        element.closest("[data-item-id]")?.dataset.itemId ??
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
    async _onPowerRoll(event, target) {
      const dataset = target.dataset;
      await rollWithTargets({
        actor: this.actor,
        label: dataset.label ? `${dataset.label}` : "",
        apply: dataset.apply,
        powertype: dataset.powertype ? dataset.powertype.split(",") : "",
        exec: (targetTokens) =>
          this._onPowerRollExec(event, target, targetTokens),
      });
    }
    async _onPowerRollExec(event, element, targetTokens) {
      event.preventDefault();
      // ここでの `target` は「ロールの対象トークン」を指す既存の名前なので、
      // 押された要素のほうを `element` で受ける
      const dataset = element.dataset;
      const itemId =
        dataset.itemid ??
        element.closest("[data-item-id]")?.dataset.itemId ??
        null;
      const formula = dataset.roll;
      const powertype = dataset.powertype ? dataset.powertype.split(",") : "";
      const powertable = dataset.pt.split(",");
      //const powertable = dataset.pt.split(",").map(Number);
      const roll = await powerRoll(formula, powertable);

      return await createPowerCard({
        actor: this.actor,
        item: itemId ? this.actor.items.get(itemId) : null,
        roll,
        label: `${dataset.label}`,
        apply: dataset.apply,
        powertype,
        targetTokens,
      });
    }

    async _onApplyEffect(event, target) {
      event.preventDefault();
      const item = this._itemFromTarget(target);
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
        if (selectedTokens.length === 0) return;
        selectedTokens.forEach((token) => game.user.targets.add(token));
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

    async _onMpCost(event, target) {
      event.preventDefault();
      const element = target;
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

    async _onHpCost(event, target) {
      event.preventDefault();
      const element = target;
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

    async _onResourceCost(event, target) {
      event.preventDefault();
      const element = target;
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

    async _onLootRoll(event, target) {
      event.preventDefault();
      lootRoll(this.actor);
    }

    async _onRollRequest(event, target) {
      event.preventDefault();

      const dataset = target.dataset;
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

    async _onPopularityRoll(event, target) {
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

    async _onPreEmptiveRoll(event, target) {
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

    async _onChangePermission(event, target) {
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

    async _showItemDetails(event, target) {
      event.preventDefault();
      this._toggleDescription(target, ".item", ".item-description");
    }

    async _showSpellList(event, target) {
      event.preventDefault();
      this._toggleDescription(target, ".item", ".spelllist-description");
    }

    async _showSpellDetails(event, target) {
      event.preventDefault();
      this._toggleDescription(target, ".spell", ".spell-description");
    }

    async _showActionDetails(event, target) {
      event.preventDefault();
      this._toggleDescription(target, ".action", ".action-description");
    }

    async _onAdjustmentButton(event, target) {
      event.preventDefault();
      const action = target.dataset.action;
      const input = target.parentElement.querySelector("input");

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

    async _onQuantityButton(event, target) {
      event.preventDefault();
      const action = target.dataset.action;
      const input = target.closest("li").querySelector("input.qt-change");
      const property = this._itemProperty(target);
      const item = this._itemFromTarget(target);

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

    async _changeQuantity(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newQuantity = Number(target.value);
      await this._updateQuantity(item, newQuantity);
    }

    async _updateQuantity(item, quantity) {
      await item.update({ "system.quantity": quantity });
    }

    async _onSkilllevelButton(event, target) {
      event.preventDefault();
      const action = target.dataset.action;
      const input = target.closest("li").querySelector("input.sl-change");
      const property = this._itemProperty(target);
      const item = this._itemFromTarget(target);

      let skilllevel = parseInt(input.value);
      if (isNaN(skilllevel)) skilllevel = 0;
      if (action === "decrease") skilllevel -= 1;
      else if (action === "increase") skilllevel += 1;

      input.value = skilllevel;

      if (item) await item.update({ [property]: skilllevel });

      this.submit();
    }

    async _changeSkillLevel(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newSkillLevel = Number(target.value);
      item.update({ "system.skilllevel": newSkillLevel });
    }

    async _changeSkillMod(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newSkillMod = Number(target.value);
      if (newSkillMod == 0) newSkillMod = null;
      item.update({ "system.skillmod": newSkillMod });
    }
    async _onCheckmodButton(event, target) {
      event.preventDefault();
      const action = target.dataset.action;
      const input = target.closest("li").querySelector("input.cm-change");
      const property = this._itemProperty(target);
      const item = this._itemFromTarget(target);

      let checkmod = parseInt(input.value);
      if (isNaN(checkmod)) checkmod = 0;
      if (action === "decrease") checkmod -= 1;
      else if (action === "increase") checkmod += 1;

      input.value = checkmod;

      if (item) await item.update({ [property]: checkmod });

      this.submit();
    }

    async _changeCheckMod(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newCheckMod = Number(target.value);
      if (newCheckMod == 0) newCheckMod = null;
      item.update({ "system.checkmod": newCheckMod });
    }

    async _changeCheckMod1(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newCheckMod = Number(target.value);
      if (newCheckMod == 0) newCheckMod = null;
      item.update({ "system.checkmod1": newCheckMod });
    }

    async _changeCheckMod2(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newCheckMod = Number(target.value);
      if (newCheckMod == 0) newCheckMod = null;
      item.update({ "system.checkmod2": newCheckMod });
    }

    async _changeCheckMod3(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newCheckMod = Number(target.value);
      if (newCheckMod == 0) newCheckMod = null;
      item.update({ "system.checkmod3": newCheckMod });
    }

    async _changePowerMod(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newPowerMod = Number(target.value);
      if (newPowerMod == 0) newPowerMod = null;
      item.update({ "system.powermod": newPowerMod });
    }

    async _changeEquip(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newEquip = target.checked;
      item.update({ "system.equip": newEquip });
    }

    async _changeReading(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newReading = target.checked;
      item.update({ "system.reading": newReading });
    }

    async _changeConversation(event, target) {
      event.preventDefault();

      const item = this._itemFromTarget(target);
      let newConversation = target.checked;
      item.update({ "system.conversation": newConversation });
    }

    async _onGrowthCheck(event, target) {
      event.preventDefault();
      growthCheck(this.actor);
    }

    async _onActionTable(event, target) {
      event.preventDefault();
      const element = target;
      actionRoll(element, this.actor);
    }

    async _onActionTableDrag(event, target) {
      event.preventDefault();
      const dataset = target.dataset;
      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
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

    async _onUsePhasearea(event, target) {
      event.preventDefault();
      const selectedTokens = await Util.getControlledActor(this.actor);
      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
        return;
      } else if (selectedTokens.length > 1) {
        ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
        return;
      }

      const item = this._itemFromTarget(target);
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

    async _onMaterialcardCost(event, target) {
      event.preventDefault();
      const selectedTokens = await Util.getControlledActor(this.actor);

      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
        return;
      } else if (selectedTokens.length > 1) {
        ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
        return;
      }

      const item = this._itemFromTarget(target);

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

    async _onNotesGet(event, target) {
      event.preventDefault();
      const selectedTokens = await Util.getControlledActor(this.actor);

      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
        return;
      } else if (selectedTokens.length > 1) {
        ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
        return;
      }

      const item = this._itemFromTarget(target);

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

    async _onNotesCost(event, target) {
      event.preventDefault();
      const selectedTokens = await Util.getControlledActor(this.actor);

      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
        return;
      } else if (selectedTokens.length > 1) {
        ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
        return;
      }

      const item = this._itemFromTarget(target);

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

    async _onNotesAddGet(event, target) {
      event.preventDefault();
      const selectedTokens = await Util.getControlledActor(this.actor);

      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
        return;
      } else if (selectedTokens.length > 1) {
        ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
        return;
      }

      const item = this._itemFromTarget(target);

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

    async _onTacspowerGet(event, target) {
      event.preventDefault();
      const selectedTokens = await Util.getControlledActor(this.actor);

      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
        return;
      } else if (selectedTokens.length > 1) {
        ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
        return;
      }

      const item = this._itemFromTarget(target);

      if (item.system.get) {
        let resourceType = {
          type: "tacspower",
        };
        await this._updateResource(resourceType, item.system.get);
      }
    }

    async _onTacspowerCost(event, target) {
      event.preventDefault();
      const selectedTokens = await Util.getControlledActor(this.actor);

      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
        return;
      } else if (selectedTokens.length > 1) {
        ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
        return;
      }

      const item = this._itemFromTarget(target);

      if (item.system.cost) {
        let resourceType = {
          type: "tacspower",
        };
        await this._updateResource(resourceType, item.system.cost, -1);
      }
    }

    async _onNotesReset(event, target) {
      event.preventDefault();

      await this._updateAllResource({type: "note"}, null);
    }

    async _onLifelineReset(event, target) {
      event.preventDefault();

      await this._updateAllResource({type: "lifeline"}, null);
    }

    async _onLifelineAdd(event, target) {
      event.preventDefault();

      await this._updateAllResource({type: "lifeline"}, 1);
    }

    async _onTacspowerReset(event, target) {
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

    async _onBookmarkDrop(event, target) {
      event.preventDefault();

      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;

      const droppedItem = await fromUuid(data.uuid ?? data.data?.uuid);
      if (droppedItem) await this._addBookmark(droppedItem);
    }

    /**
     * ブックマーク帯に落とされたアイテムに印を付ける。
     *
     * 既に持っているものはそれに、同じ名前のものがあればそれに付ける。
     * どちらでもなければ印を立てた複製をアクターへ足す。
     *
     * @param {Item} droppedItem
     */
    async _addBookmark(droppedItem) {
      const owned =
        this.actor.items.get(droppedItem.id) ??
        this.actor.items.find((i) => i.name === droppedItem.name);

      if (owned) return owned.update({ "system.bookmark": true });

      const newItemData = droppedItem.toObject();
      newItemData.system.bookmark = true;
      return this.actor.createEmbeddedDocuments("Item", [newItemData]);
    }

    async _onChangeBookmark(event, target) {
      event.preventDefault();
      const item = this._itemFromTarget(target);
      item.update({ "system.bookmark": !item.system.bookmark });
    }
  };
