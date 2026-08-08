import { Util } from "./utils.mjs";

/**
 * アクターシートのコンテキスト作り。V1(`sheets/actor-sheet.mjs`)と
 * ApplicationV2(`sheets/actor-sheet-V2.mjs`)の両方から呼ぶ。
 *
 * V1 は `toObject(false)` を通した素のオブジェクトの配列を、
 * V2 は生の Item Document の配列を `context.items` に載せて渡す。
 * ここで見るのは `type` / `name` / `img` / `system.*` だけなので、
 * どちらでも同じように動く。
 */

/**
 * 持ち物を種別ごとの配列に振り分け、テンプレートが読むキーを
 * `context` に積む。
 *
 * @param {object} context `items` を持つシートのコンテキスト
 */
export function prepareItemContext(context) {
  // Initialize containers.
  const skills = [];
  const checks = [];
  const battlechecks = [];
  const resources = [];
  const weapons = [];
  const battleweapons = [];
  const armors = [];
  const battlearmors = [];
  const accessories = [];
  const battleaccessories = [];
  const gear = [];
  const combatabilities = [];
  const enhancearts = [];
  const magicalsongs = [];
  const ridingtricks = [];
  const alchemytechs = [];
  const phaseareas = [];
  const tactics = [];
  const infusion = [];
  const barbarousskill = [];
  const essenceweave = [];
  const otherfeature = [];
  const raceabilities = [];
  const languages = [];
  const spells = [];
  const sorcerer = [];
  const conjurer = [];
  const wizard = [];
  const priest = [];
  const magitech = [];
  const fairy = [];
  const druid = [];
  const daemon = [];
  const abyssal = [];
  const bibliomancer = [];
  const monsterabilities = [];
  const actions = [];
  const actionsf17 = [];
  const actionsf16 = [];
  const actionsf38 = [];
  const actionsf35 = [];
  const actionsf59 = [];
  const actionsf54 = [];
  const actionsf610 = [];
  const actionsf63 = [];
  const actionsd18 = [];
  const actionsd28 = [];
  const actionsd49 = [];
  const actionsd610 = [];
  const notes = [];
  const materials = {
    red: { b: [], a: [], s: [], ss: [] },
    green: { b: [], a: [], s: [], ss: [] },
    black: { b: [], a: [], s: [], ss: [] },
    white: { b: [], a: [], s: [], ss: [] },
    gold: { b: [], a: [], s: [], ss: [] },
  };
  const lifelines = [];
  const tacspowers = [];
  const magitechrs = [];
  const abyssexs = [];
  const otherfeatureresources = [];
  let materialshow = {
    all: false,
    red: false,
    green: false,
    black: false,
    white: false,
    gold: false,
  };
  let contentItem = {
    vitRes: null,
    mndRes: null,
    monRes: null,
    monAtk: null,
  };
  const bookmarks = [];

  // Iterate through items, allocating to containers
  for (let i of context.items) {
    i.img = i.img || Item.DEFAULT_ICON;
    // Append to skill.
    if (i.type === "skill") {
      skills.push(i);
    }
    // Append to check & battlecheck.
    if (i.type === "check") {
      checks.push(i);
      if (i.system.showbtcheck === true) {
        battlechecks.push(i);
      }
      if (i.name === game.i18n.localize("SW25.Config.ResVit")){
        contentItem.vitRes = i;
      } else if (i.name === game.i18n.localize("SW25.Config.ResMnd")){
        contentItem.mndRes = i;
      }
    }
    // Append to resource.
    if (i.type === "resource") {
      if (
        i.system?.resource?.type == null ||
        i.system?.resource?.type == "none" ||
        !i.system?.resource?.isNotBattle
      ) {
        resources.push(i);
      }

      if (i.system?.resource?.type == "note") {
        notes.push(i);
      } else if (i.system?.resource?.type == "material") {
        const materialtype = i.system?.resource?.materialtype;
        const materialrank = i.system?.resource?.materialrank;
        // 色か階級が未設定の素材が 1 つでもあると、ここで undefined へ
        // push してシートが描画ごと落ちていた。素材表には並べられないので、
        // 代わりにリソース一覧へ出してシート上から直せるようにする
        if (materials[materialtype]?.[materialrank]) {
          materials[materialtype][materialrank].push(i);
          materialshow.all = true;
          materialshow[materialtype] = true;
        } else if (!resources.includes(i)) {
          resources.push(i);
        }
      } else if (i.system?.resource?.type == "lifeline") {
        lifelines.push(i);
      } else if (i.system?.resource?.type == "tacspower") {
        tacspowers.push(i);
      } else if (i.system?.resource?.type == "magitech") {
        magitechrs.push(i);
      } else if (i.system?.resource?.type == "abyssex") {
        abyssexs.push(i);
      } else if (i.system?.resource?.type == "otherfeature") {
        otherfeatureresources.push(i);
      }
    }
    // Append to weapon.
    else if (i.type === "weapon") {
      weapons.push(i);
      if (i.system.equip === true) {
        battleweapons.push(i);
      }
    }
    // Append to armor.
    else if (i.type === "armor") {
      armors.push(i);
      if (i.system.equip === true) {
        battlearmors.push(i);
      }
    }
    // Append to accessory.
    else if (i.type === "accessory") {
      accessories.push(i);
      if (i.system.equip === true) {
        battleaccessories.push(i);
      }
    }
    // Append to gear.
    else if (i.type === "item") {
      gear.push(i);
    }

    // Append to combatability.
    else if (i.type === "combatability") {
      combatabilities.push(i);
    }

    // Append to enhancearts.
    else if (i.type === "enhancearts") {
      enhancearts.push(i);
    }

    // Append to magicalsong.
    else if (i.type === "magicalsong") {
      magicalsongs.push(i);
    }

    // Append to ridingtrick.
    else if (i.type === "ridingtrick") {
      ridingtricks.push(i);
    }

    // Append to alchemytech.
    else if (i.type === "alchemytech") {
      alchemytechs.push(i);
    }

    // Append to phasearea.
    else if (i.type === "phasearea") {
      phaseareas.push(i);
    }

    // Append to tactics.
    else if (i.type === "tactics") {
      tactics.push(i);
    }

    // Append to infusion.
    else if (i.type === "infusion") {
      infusion.push(i);
    }

    // Append to barbarousskill.
    else if (i.type === "barbarousskill") {
      barbarousskill.push(i);
    }

    // Append to essenceweave.
    else if (i.type === "essenceweave") {
      essenceweave.push(i);
    }

    // Append to otherfeeature.
    else if (i.type === "otherfeature") {
      otherfeature.push(i);
    }

    // Append to raceability.
    else if (i.type === "raceability") {
      raceabilities.push(i);
    }

    // Append to languages.
    else if (i.type === "language") {
      languages.push(i);
    }

    // Append to spells.
    else if (i.type === "spell") {
      spells.push(i);
      if (i.system.type === "sorcerer") {
        sorcerer.push(i);
      }
      if (i.system.type === "conjurer") {
        conjurer.push(i);
      }
      if (i.system.type === "wizard") {
        wizard.push(i);
      }
      if (i.system.type === "priest") {
        priest.push(i);
      }
      if (i.system.type === "magitech") {
        magitech.push(i);
      }
      if (i.system.type === "fairy") {
        fairy.push(i);
      }
      if (i.system.type === "druid") {
        druid.push(i);
      }
      if (i.system.type === "daemon") {
        daemon.push(i);
      }
      if (i.system.type === "abyssal") {
        abyssal.push(i);
      }        
      if (i.system.type === "bibliomancer") {
        bibliomancer.push(i);
      }
    }

    // Append to monsterability.
    else if (i.type === "monsterability") {
      monsterabilities.push(i);
      if (i.name === game.i18n.localize("SW25.Config.MonRes")) {
        contentItem.monRes = i;
      }
      if (
        contentItem.monAtk == null &&
        i.system.label1 == game.i18n.localize("SW25.Config.MonHit") &&
        i.system.label2 == game.i18n.localize("SW25.Config.MonDmg") &&
        i.system.label3 == game.i18n.localize("SW25.Config.MonDge") 
      ) {
        contentItem.monAtk = i;
      }
    }

    // Append to action.
    else if (i.type === "action") {
      actions.push(i);
      if (i.system.actiondice == "f1") {
        if (i.system.actionresult == "7") {
          actionsf17.push(i);
        }
        if (i.system.actionresult == "6") {
          actionsf16.push(i);
        }
      }
      if (i.system.actiondice == "f3") {
        if (i.system.actionresult == "8") {
          actionsf38.push(i);
        }
        if (i.system.actionresult == "5") {
          actionsf35.push(i);
        }
      }
      if (i.system.actiondice == "f5") {
        if (i.system.actionresult == "9") {
          actionsf59.push(i);
        }
        if (i.system.actionresult == "4") {
          actionsf54.push(i);
        }
      }
      if (i.system.actiondice == "f6") {
        if (i.system.actionresult == "10") {
          actionsf610.push(i);
        }
        if (i.system.actionresult == "3") {
          actionsf63.push(i);
        }
      }
      if (i.system.actiondice == "d1") {
        if (i.system.actionresult == "8") {
          actionsd18.push(i);
        }
      }
      if (i.system.actiondice == "d2") {
        if (i.system.actionresult == "8") {
          actionsd28.push(i);
        }
      }
      if (i.system.actiondice == "d4") {
        if (i.system.actionresult == "9") {
          actionsd49.push(i);
        }
      }
      if (i.system.actiondice == "d6") {
        if (i.system.actionresult == "10") {
          actionsd610.push(i);
        }
      }
    }

    // Append to bookmarks.
    if (i.system.bookmark) {
      bookmarks.push(i);
    }

  }

  let eashow = true;
  if (enhancearts.length == 0) {
    eashow = false;
  } else eashow = true;

  let msshow = true;
  if (magicalsongs.length == 0) {
    msshow = false;
  } else msshow = true;

  let rtshow = true;
  if (ridingtricks.length == 0) {
    rtshow = false;
  } else rtshow = true;

  let atshow = true;
  if (alchemytechs.length == 0) {
    atshow = false;
  } else atshow = true;

  let pashow = true;
  if (phaseareas.length == 0) {
    pashow = false;
  } else pashow = true;

  let tcshow = true;
  if (tactics.length == 0) {
    tcshow = false;
  } else tcshow = true;

  let ifshow = true;
  if (infusion.length == 0) {
    ifshow = false;
  } else ifshow = true;

  let bsshow = true;
  if (barbarousskill.length == 0) {
    bsshow = false;
  } else bsshow = true;

  let ewshow = true;
  if (essenceweave.length == 0) {
    ewshow = false;
  } else ewshow = true;

  let ofshow = true;
  if (otherfeature.length == 0) {
    ofshow = false;
  } else ofshow = true;

  let scshow = true;
  if (sorcerer.length == 0) {
    scshow = false;
  } else scshow = true;

  let cnshow = true;
  if (conjurer.length == 0) {
    cnshow = false;
  } else cnshow = true;

  let wzshow = true;
  if (wizard.length == 0) {
    wzshow = false;
  } else wzshow = true;

  let prshow = true;
  if (priest.length == 0) {
    prshow = false;
  } else prshow = true;

  let mtshow = true;
  if (magitech.length == 0) {
    mtshow = false;
  } else mtshow = true;

  let frshow = true;
  if (fairy.length == 0) {
    frshow = false;
  } else frshow = true;

  let drshow = true;
  if (druid.length == 0) {
    drshow = false;
  } else drshow = true;

  let dmshow = true;
  if (daemon.length == 0) {
    dmshow = false;
  } else dmshow = true;

  let abshow = true;
  if (abyssal.length == 0) {
    abshow = false;
  } else abshow = true;

  let bmshow = true;
  if (bibliomancer.length == 0) {
    bmshow = false;
  } else bmshow = true;

  const typeOrder = CONFIG.SW25.itemTypeList.map(e => e.type);

  const sortedBookmarks = bookmarks.sort((a, b) => {
    const ai = typeOrder.indexOf(a.type);
    const bi = typeOrder.indexOf(b.type);

    const aOrder = ai === -1 ? Infinity : ai;
    const bOrder = bi === -1 ? Infinity : bi;

    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, "ja");
  });

  
  // Assign and return
  context.skills = skills;
  context.checks = checks;
  context.battlechecks = battlechecks;
  context.resources = resources;
  context.weapons = weapons;
  context.battleweapons = battleweapons;
  context.armors = armors;
  context.battlearmors = battlearmors;
  context.accessories = accessories;
  context.battleaccessories = battleaccessories;
  context.gear = gear;
  context.combatabilities = combatabilities;
  context.enhancearts = enhancearts;
  context.eashow = eashow;
  context.magicalsongs = magicalsongs;
  context.msshow = msshow;
  context.ridingtricks = ridingtricks;
  context.rtshow = rtshow;
  context.alchemytechs = alchemytechs;
  context.atshow = atshow;
  context.phaseareas = phaseareas;
  context.pashow = pashow;
  context.tactics = tactics;
  context.tcshow = tcshow;
  context.infusion = infusion;
  context.ifshow = ifshow;
  context.barbarousskill = barbarousskill;
  context.bsshow = bsshow;
  context.essenceweave = essenceweave;
  context.ewshow = ewshow;
  context.otherfeature = otherfeature;
  context.ofshow = ofshow;
  context.raceabilities = raceabilities;
  context.languages = languages;
  context.spells = spells;
  context.sorcerer = sorcerer;
  context.scshow = scshow;
  context.conjurer = conjurer;
  context.cnshow = cnshow;
  context.wizard = wizard;
  context.wzshow = wzshow;
  context.priest = priest;
  context.prshow = prshow;
  context.magitech = magitech;
  context.mtshow = mtshow;
  context.fairy = fairy;
  context.frshow = frshow;
  context.druid = druid;
  context.drshow = drshow;
  context.daemon = daemon;
  context.dmshow = dmshow;
  context.abyssal = abyssal;
  context.abshow = abshow;
  context.bibliomancer = bibliomancer;
  context.bmshow = bmshow;
  context.monsterabilities = monsterabilities;
  context.actions = actions;
  context.actionsf17 = actionsf17;
  context.actionsf16 = actionsf16;
  context.actionsf38 = actionsf38;
  context.actionsf35 = actionsf35;
  context.actionsf59 = actionsf59;
  context.actionsf54 = actionsf54;
  context.actionsf610 = actionsf610;
  context.actionsf63 = actionsf63;
  context.actionsd18 = actionsd18;
  context.actionsd28 = actionsd28;
  context.actionsd49 = actionsd49;
  context.actionsd610 = actionsd610;
  context.notes = notes;
  context.materials = materials;
  context.lifelines = lifelines;
  context.tacspowers = tacspowers;
  context.magitechrs = magitechrs;
  context.abyssexs = abyssexs;
  context.otherfeatureresources = otherfeatureresources;
  context.noteshow = notes.length > 0;
  context.materialshow = materialshow;
  context.lifelineshow = lifelines.length > 0;
  context.tacspowershow = tacspowers.length > 0;
  context.magitechrshow = magitechrs.length > 0;
  context.abyssexshow = abyssexs.length > 0;
  context.otherfeaturershow = otherfeatureresources.length > 0;
  context.contentItem = contentItem;
  context.bookmarks = sortedBookmarks;
}

/**
 * シートの配色。`system.color` が無いときは既定色に落とす。
 *
 * テンプレートは CSS 変数へ `r,g,b` の 3 つ組で流し込むので、
 * 16 進表記のままでは使えない。
 *
 * @param {object} system アクターの system
 * @returns {{main: {bg: object, text: object}, sub: {bg: object, text: object}}}
 */
export function prepareColorSetting(system) {
  if (!system.color) {
    return {
      main: { bg: { r: 239, g: 230, b: 216 }, text: { r: 0, g: 0, b: 0 } },
      sub: { bg: { r: 247, g: 243, b: 232 }, text: { r: 0, g: 0, b: 0 } },
    };
  }
  return {
    main: {
      bg: Util.hexToRgb(system.color.main.bg),
      text: Util.hexToRgb(system.color.main.text),
    },
    sub: {
      bg: Util.hexToRgb(system.color.sub.bg),
      text: Util.hexToRgb(system.color.sub.text),
    },
  };
}

/**
 * 能力値の見出し。テンプレートが `{{ability.label}}` で読むので
 * 能力値そのものに載せる。
 *
 * V1 は `toObject(false)` のコピーに書いていたが、V2 は生の DataModel に
 * 書く。`system.abilities.*` は SchemaField の中の素のオブジェクトで、
 * `label` は宣言されていないぶん保存にも `toObject` にも乗らない。
 * データ準備のたびに作り直される値なので、書いても残らない。
 *
 * @param {object} system アクターの system(能力値を持つ型のみ)
 */
export function prepareAbilityLabels(system) {
  for (const [key, ability] of Object.entries(system.abilities ?? {})) {
    ability.label = game.i18n.localize(CONFIG.SW25.abilities[key]) ?? key;
  }
}

/** 本文エディタを持つフィールド。型ごとに持っているものが違う */
const EDITOR_FIELDS = {
  biography: "enrichedBiography",
  loot: "enrichedLoot",
  gminfo: "enrichedGminfo",
};

/**
 * 本文エディタに出す enrich 済みの HTML。
 *
 * V1 の `{{editor}}` は使わない。v14 の `{{editor}}` が返す
 * `<div class="editor">` を起動する `.editor-content[data-edit]` の配線は
 * V1 の FormApplication にしかなく、ApplicationV2 では鉛筆を押しても
 * 何も起きない(`appv1/api/form-application-v1.mjs:171`)。
 * どちらの世代も `{{formInput}}` 経由の `<prose-mirror>` に寄せ、
 * 閉じている間に見せる本文をここで作る。
 *
 * @param {Actor} actor
 * @returns {Promise<Record<string, string>>}
 */
export async function prepareActorEditors(actor) {
  const enrich = foundry.applications.ux.TextEditor.implementation.enrichHTML;
  const options = { relativeTo: actor, rollData: actor.getRollData() };
  const out = {};
  for (const [field, key] of Object.entries(EDITOR_FIELDS)) {
    if (!actor.system.schema.has(field)) continue;
    out[key] = await enrich(actor.system[field], options);
  }
  return out;
}
