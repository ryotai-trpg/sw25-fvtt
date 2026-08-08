const { DialogV2 } = foundry.applications.api;

// Select Roll Method Dialog
export async function targetRollDialog(targetTokens, label) {
  if (targetTokens.size == 1) {
    return "once";
  }
  if (targetTokens.size < 2) return;

  // DialogV2.wait は押されたボタンの action を返し、
  // ボタンを押さずに閉じた場合は null を返す。
  const rollMethod = await DialogV2.wait({
    window: { title: label },
    content: game.i18n.localize("DIALOG.rollMethod"),
    buttons: [
      { action: "once", label: game.i18n.localize("DIALOG.once") },
      { action: "individual", label: game.i18n.localize("DIALOG.individual") },
      { action: "cancel", label: game.i18n.localize("Cancel"), default: true },
    ],
  });

  return rollMethod ?? "cancel";
}

// Select Target Dialog
export async function targetSelectDialog(title) {
  // get all tokens
  const tokens = canvas.tokens.placeables;

  // no token error
  if (tokens.length === 0) {
    return ui.notifications.warn(game.i18n.localize("SW25.NotTokenwarn"));
  }

  // categorize tokens
  const categories = {
    friendly: [],
    neutral: [],
    hostile: [],
  };

  tokens.forEach((token) => {
    // invisible check.
    if (!game.user.isGM && token.document.hidden) return;
    
    switch (token.document.disposition) {
      case 1:
        categories.friendly.push(token);
        break;
      case 0:
        categories.neutral.push(token);
        break;
      case -1:
        categories.hostile.push(token);
        break;
    }
  });

  // sort by name (Unicode)
  for (const key in categories) {
    categories[key].sort((a, b) => a.name.localeCompare(b.name));
  }

  // create Dialog contents
  const createCategoryBox = (category, title, categoryId) => {
    let box = `<fieldset class="target-select">
      <legend id="${categoryId}-toggle" style="cursor: pointer;">
        <span class="selectable">${title}</span>
      </legend>`;
    category.forEach((token) => {
      box += `
        <div class="token-check-wrap ${categoryId}-token">
          <input type="checkbox" id="token-${token.id}" name="${categoryId}" value="${token.id}">
          <label for="token-${token.id}">
            <img src="${token.document.texture.src}" class="token-icon">
            ${token.name}
          </label>
        </div>`;
    });
    box += `</fieldset>`;
    return box;
  };

  const content = `
    <div style="width: 100%;">
      <div class="select-all-wrap" style="margin-bottom:6px;">
        <label style="cursor:pointer;">
          <input type="checkbox" id="select-all-toggle">
          <strong>${game.i18n.localize("SW25.SelectAll")}</strong>
        </label>
      </div>

      ${createCategoryBox(
        categories.friendly,
        game.i18n.localize("SW25.Disposition.Friendly"),
        "friendly"
      )}
      ${createCategoryBox(
        categories.neutral,
        game.i18n.localize("SW25.Disposition.Neutral"),
        "neutral"
      )}
      ${createCategoryBox(
        categories.hostile,
        game.i18n.localize("SW25.Disposition.Hostile"),
        "hostile"
      )}
    </div>`;

  // 選択されたトークンを返す。キャンセル、または何も選ばずに OK / 閉じた場合は空配列。
  const selected = await DialogV2.wait({
    window: { title: game.i18n.localize("SW25.TargetSelect") + ` : ${title}` },
    position: { width: 500 },
    content: content,
    buttons: [
      {
        action: "process",
        label: game.i18n.localize("OK"),
        callback: (event, button, dialog) => {
          // 全選択チェックボックスは値を持たないので、コマの分だけを拾う
          const selectedIds = Array.from(
            dialog.element.querySelectorAll(
              'input[type="checkbox"][id^="token-"]:checked'
            )
          ).map((el) => el.value);

          if (selectedIds.length === 0) {
            ui.notifications.warn(game.i18n.localize("SW25.Notargetwarn"));
            return [];
          }

          return canvas.tokens.placeables.filter((token) =>
            selectedIds.includes(token.id)
          );
        },
      },
      {
        action: "cancel",
        label: game.i18n.localize("Cancel"),
        default: true,
        callback: () => [],
      },
    ],
    render: (event, dialog) => {
      const root = dialog.element;

      const addToggleHandler = (categoryId) => {
        const toggle = root.querySelector(`#${categoryId}-toggle`);
        const checkboxes = root.querySelectorAll(
          `input[name="${categoryId}"]`
        );

        toggle?.addEventListener("click", () => {
          const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
          for (const cb of checkboxes) {
            cb.checked = !allChecked;
            cb.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });

        // change font when selected
        for (const cb of checkboxes) {
          cb.addEventListener("change", () => {
            const label = cb.nextElementSibling;
            if (label) {
              label.style.fontWeight = cb.checked ? "bold" : "normal";
            }
          });
        }
      };

      addToggleHandler("friendly");
      addToggleHandler("neutral");
      addToggleHandler("hostile");

      const allCheckboxes = root.querySelectorAll(
        'input[type="checkbox"][id^="token-"]'
      );
      const selectAll = root.querySelector("#select-all-toggle");

      const updateSelectAllState = () => {
        const checkedCount = Array.from(allCheckboxes).filter(
          (cb) => cb.checked
        ).length;
        if (selectAll) {
          selectAll.checked =
            allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
        }
      };

      updateSelectAllState();

      selectAll?.addEventListener("change", () => {
        for (const cb of allCheckboxes) {
          cb.checked = selectAll.checked;
          cb.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    },
  });

  return selected ?? [];
}
