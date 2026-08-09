export class Util {
  static hexToRgb(hex) {
    hex = hex.replace(/^#/, "");

    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    if (hex.length !== 6) {
      throw new Error("Invalid hex color format");
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    return { r, g, b };
  }

  static getValue(target, keyB = null) {
    if (!keyB) return target;

    return keyB.split(".").reduce((o, k) => (o ? o[k] : undefined), target);
  }

  static setValue(target, keyB = null, value) {
    if (!keyB) return value;

    const keys = keyB.split(".");
    const lastKey = keys.pop();
    const container = keys.reduce((o, k) => (o[k] ??= {}), target);
    container[lastKey] = value;
  }

  /**
   * 「コマがちょうど 1 体選ばれている」を要求する定型。
   * 0 体なら未選択、2 体以上なら選びすぎの警告を出して null を返す。
   *
   * コマの集め方は `getControlledActor()`(そのアクターのコマで補う)と
   * `getControlledActorFromUser()`(ユーザーの担当キャラクターで補う)で
   * 別物なので、**どちらで集めたかは呼び出し側に残す**。
   *
   * @param {Token[]} tokens  上の 2 つのどちらかの戻り値
   * @returns {Token|null}
   */
  static requireSingleToken(tokens) {
    if (tokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return null;
    }
    if (tokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return null;
    }
    return tokens[0];
  }

  /**
   * Get Controlled Actor or This Actor
   */
  static async getControlledActor(actor) {
    let selectedTokens = canvas.tokens.controlled;
    if (actor && selectedTokens.length === 0) {
      selectedTokens = canvas.tokens.placeables.filter(
        (t) => t.actor?.id === actor.id
      );
    }
    return selectedTokens;
  }

  /**
   * Get Controlled Actor or User's Actor
   */
  static async getControlledActorFromUser() {
    let selectedTokens = canvas.tokens.controlled;
    if (
      game.settings.get("sw25", "defaultCharaAction") &&
      game.user.character &&
      selectedTokens.length === 0
    ) {
      const userActor = game.user.character;
      if (userActor) {
        selectedTokens = canvas.tokens.placeables.filter(
          (t) => t.actor?.id === userActor.id
        );
      }
    }
    return selectedTokens;
  }
}

/* -------------------------------------------- */
/*  高さのアニメーション                         */
/* -------------------------------------------- */

/** 高さと一緒に畳む余白。jQuery の slideUp / slideDown と同じ組 */
const SLIDE_PROPS = [
  "height",
  "paddingTop",
  "paddingBottom",
  "marginTop",
  "marginBottom",
  "borderTopWidth",
  "borderBottomWidth",
];

/**
 * 高さを 0 ↔ 実寸で行き来させる。jQuery の `slideUp()` / `slideDown()` 相当。
 *
 * 開閉する要素は CSS で `display: none` にしてあるので、開くときは
 * 先に表示してから実寸を測る。閉じたときは `display: none` を
 * インラインで残す(次の描画で消えるが、その場では畳んだままにする)。
 *
 * @param {HTMLElement} el
 * @param {boolean} down  開くなら true
 * @param {number} [duration]  ミリ秒。jQuery の既定と同じ 400
 * @returns {Promise<void>}
 */
async function slide(el, down, duration = 400) {
  for (const a of el.getAnimations()) a.cancel();

  if (down) {
    el.style.removeProperty("display");
    if (getComputedStyle(el).display === "none") el.style.display = "block";
  }

  const cs = getComputedStyle(el);
  const open = { height: `${el.getBoundingClientRect().height}px` };
  for (const p of SLIDE_PROPS.slice(1)) open[p] = cs[p];
  const closed = Object.fromEntries(Object.keys(open).map((p) => [p, "0px"]));

  const overflow = el.style.overflow;
  el.style.overflow = "hidden";
  try {
    await el.animate([down ? closed : open, down ? open : closed], {
      duration,
      easing: "ease-in-out",
    }).finished;
  } catch {
    // 途中でもう一度押されて cancel された。後始末は新しい方に任せる
    return;
  }
  el.style.overflow = overflow;
  if (!down) el.style.display = "none";
}

/** 畳む。閉じ切ったら `display: none` を置く */
export function slideUp(el, duration) {
  return slide(el, false, duration);
}

/** 開く */
export function slideDown(el, duration) {
  return slide(el, true, duration);
}

/** 表示状態を見て開くか畳むかを決める */
export function slideToggle(el, duration) {
  return slide(el, getComputedStyle(el).display === "none", duration);
}
