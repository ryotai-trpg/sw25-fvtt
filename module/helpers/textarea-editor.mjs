/**
 * `.textarea-editor` の保存。
 *
 * blur のたびに `system.<data-path>`(生のテキスト)と
 * `system.display<data-path>`(改行を `<br>` にしたもの)をまとめて書く。
 * display 側はテンプレートに `name=` として現れないので、
 * DataModel に宣言し忘れると `{{{system.display*}}}` が空になる
 * (`data/item/_shared.mjs` の `textareaEditorFields`)。
 *
 * @param {HTMLElement} root      シートのルート要素
 * @param {Document} document     書き込み先
 */
export function bindTextareaEditors(root, document) {
  for (const textarea of root.querySelectorAll(".textarea-editor")) {
    // data-path が無い要素にも張っていたため、blur のたびに
    // `system.undefined` / `system.displayundefined` を書いていた
    // (キャラクター/NPC シートのフェローメモが該当)。宣言の無いキーなので
    // DataModel が捨てるようになったが、張らないのが筋
    const path = textarea.dataset.path;
    if (!path) continue;

    textarea.addEventListener("blur", async () => {
      const content = textarea.value;
      await document.update({
        [`system.${path}`]: content,
        [`system.display${path}`]: content.replace(/\n/g, "<br>"),
      });
    });
  }
}
