(() => {
  if (window.__cinjectorPicker) return;

  const MARKER = "data-cinjector-pick";
  for (const el of document.querySelectorAll(`[${MARKER}]`)) el.removeAttribute(MARKER);

  const BASE =
    "all: initial; display: block; position: fixed; z-index: 2147483647;" +
    "pointer-events: none; box-sizing: border-box; border-style: solid;";

  function layer(color, filled) {
    const el = document.createElement("div");
    el.style.cssText = BASE + (filled ? `background: ${color};` : `border-color: ${color};`);
    return el;
  }

  const layers = {
    margin: layer("rgba(246, 178, 107, 0.55)"),
    border: layer("rgba(255, 229, 153, 0.55)"),
    padding: layer("rgba(147, 196, 125, 0.55)"),
    content: layer("rgba(111, 168, 220, 0.55)", true),
  };

  const label = document.createElement("div");
  label.style.cssText =
    BASE.replace("border-style: solid;", "") +
    "background: #1e1f24; color: #e1d8cc; font: 12px/1.4 ui-monospace, monospace;" +
    "padding: 2px 6px; border-radius: 4px; white-space: nowrap;";

  const overlay = [...Object.values(layers), label];
  document.documentElement.append(...overlay);

  let current = null;

  function describe(el) {
    let text = el.tagName.toLowerCase();
    if (el.id) text += "#" + el.id;
    for (const name of [...el.classList].slice(0, 3)) text += "." + name;
    return text;
  }

  function place(el, top, left, width, height, widths = [0, 0, 0, 0]) {
    el.style.top = top + "px";
    el.style.left = left + "px";
    el.style.width = Math.max(0, width) + "px";
    el.style.height = Math.max(0, height) + "px";
    el.style.borderWidth = widths.map((w) => Math.max(0, w) + "px").join(" ");
  }

  function position() {
    if (!current) return;
    const rect = current.getBoundingClientRect();
    const style = getComputedStyle(current);
    const px = (name) => parseFloat(style[name]) || 0;

    const m = [px("marginTop"), px("marginRight"), px("marginBottom"), px("marginLeft")];
    const b = [px("borderTopWidth"), px("borderRightWidth"), px("borderBottomWidth"), px("borderLeftWidth")];
    const p = [px("paddingTop"), px("paddingRight"), px("paddingBottom"), px("paddingLeft")];

    place(
      layers.margin,
      rect.top - m[0],
      rect.left - m[3],
      rect.width + m[1] + m[3],
      rect.height + m[0] + m[2],
      m
    );
    place(layers.border, rect.top, rect.left, rect.width, rect.height, b);
    place(
      layers.padding,
      rect.top + b[0],
      rect.left + b[3],
      rect.width - b[1] - b[3],
      rect.height - b[0] - b[2],
      p
    );
    place(
      layers.content,
      rect.top + b[0] + p[0],
      rect.left + b[3] + p[3],
      rect.width - b[1] - b[3] - p[1] - p[3],
      rect.height - b[0] - b[2] - p[0] - p[2]
    );

    label.textContent = `${describe(current)}  ${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    const top = rect.top - m[0] > 26 ? rect.top - m[0] - 24 : rect.bottom + m[2] + 4;
    label.style.top = Math.min(top, window.innerHeight - 24) + "px";
    label.style.left = Math.max(0, rect.left) + "px";
  }

  function onMove(e) {
    if (!(e.target instanceof Element) || e.target === current) return;
    current = e.target;
    position();
  }

  function block(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function isUnique(selector) {
    try {
      return document.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  function selectorFor(el) {
    if (el === document.documentElement) return "html";
    if (el === document.body) return "body";
    if (el.id && isUnique("#" + CSS.escape(el.id))) return "#" + CSS.escape(el.id);

    const parts = [];
    let node = el;
    while (node && node !== document.documentElement) {
      if (node !== el && node.id && isUnique("#" + CSS.escape(node.id))) {
        parts.unshift("#" + CSS.escape(node.id));
      } else {
        const tag = node.tagName.toLowerCase();
        const classes = [...node.classList].slice(0, 2).map((c) => "." + CSS.escape(c)).join("");
        let part = classes || tag;
        const parent = node.parentElement;
        if (parent && parent.querySelectorAll(`:scope > ${part}`).length > 1) {
          const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
          part = `${tag}${classes}:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
        parts.unshift(part);
      }
      const selector = parts.join(" > ");
      if (isUnique(selector)) return selector;
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function onClick(e) {
    block(e);
    const el = e.target;
    stop();
    if (!(el instanceof Element)) return;
    const selector = selectorFor(el);
    el.setAttribute(MARKER, "");
    browser.runtime.sendMessage({ type: "element-picked", selector });
  }

  function onKey(e) {
    if (e.key !== "Escape") return;
    block(e);
    stop();
    browser.runtime.sendMessage({ type: "pick-cancelled" });
  }

  const blocked = ["mousedown", "mouseup", "pointerdown", "pointerup", "dblclick"];

  function stop() {
    window.removeEventListener("mousemove", onMove, true);
    window.removeEventListener("scroll", position, true);
    window.removeEventListener("resize", position, true);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKey, true);
    for (const type of blocked) window.removeEventListener(type, block, true);
    for (const el of overlay) el.remove();
    delete window.__cinjectorPicker;
  }

  window.addEventListener("mousemove", onMove, true);
  window.addEventListener("scroll", position, true);
  window.addEventListener("resize", position, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKey, true);
  for (const type of blocked) window.addEventListener(type, block, true);

  window.__cinjectorPicker = { stop };
})();
