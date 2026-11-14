import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { theme } from "./theme.js";
import { pickElement, cancelPick, isPicking } from "./pick.js";

const params = new URLSearchParams(location.search);
const tabId = Number(params.get("tabId"));
const hostname = params.get("host");
const key = `css:${hostname}`;
const editingKey = `editing:${tabId}`;

const saveButton = document.getElementById("save");
const statusEl = document.getElementById("status");

document.getElementById("domain").textContent = hostname;
document.title = `CSS: ${hostname}`;

function setState(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = kind;
}

const { [key]: stored = "" } = await browser.storage.local.get(key);

let savedCss = stored;
let appliedCss = stored;
let isTabAlive = true;

const view = new EditorView({
  doc: stored,
  parent: document.getElementById("editor"),
  extensions: [
    basicSetup,
    keymap.of([
      indentWithTab,
      { key: "Mod-s", preventDefault: true, run: () => (save(), true) },
    ]),
    css(),
    theme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange();
    }),
  ],
});

const getCss = () => view.state.doc.toString();

const editorEl = document.getElementById("editor");
const sourceFrame = document.getElementById("source-frame");
const tabButtons = document.querySelectorAll(".tabs .tab");

function showTab(name) {
  for (const button of tabButtons) {
    button.classList.toggle("active", button.dataset.tab === name);
  }
  editorEl.classList.toggle("inactive", name !== "css");
  sourceFrame.classList.toggle("inactive", name !== "source");

  if (name === "css") {
    view.focus();
  } else if (!sourceFrame.src) {
    sourceFrame.src = `source.html${location.search}`;
  } else {
    sourceFrame.contentWindow.postMessage({ type: "refresh" }, location.origin);
  }
}

for (const button of tabButtons) {
  button.addEventListener("click", () => showTab(button.dataset.tab));
}

document.getElementById("pop-out-source").addEventListener("click", async () => {
  const url = browser.runtime.getURL(`editor/source.html${location.search}`);
  await browser.windows.create({ url, type: "popup", width: 800, height: 800 });
  if (!sourceFrame.classList.contains("inactive")) showTab("css");
});

function addRule(selector) {
  const doc = view.state.doc.toString();
  const separator = doc.trim() === "" ? "" : doc.endsWith("\n\n") ? "" : doc.endsWith("\n") ? "\n" : "\n\n";
  const from = doc.trim() === "" ? 0 : doc.length;
  const rule = `${separator}${selector} {\n  \n}\n`;
  const cursor = from + separator.length + selector.length + 5;
  view.dispatch({
    changes: { from, to: doc.trim() === "" ? doc.length : from, insert: rule },
    selection: { anchor: cursor },
    scrollIntoView: true,
  });
}

const pickElementButton = document.getElementById("pick-element");

pickElementButton.addEventListener("click", async () => {
  try {
    if (isPicking()) {
      await cancelPick();
      markAsUnsaved();
      return;
    }
    showTab("css");
    setState("Click an element on the page");
    const picked = await pickElement(tabId, pickElementButton);
    markAsUnsaved();
    if (!picked?.selector) return;
    await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        for (const el of document.querySelectorAll("[data-cinjector-pick]")) {
          el.removeAttribute("data-cinjector-pick");
        }
      },
    });
    addRule(picked.selector);
    const win = await browser.windows.getCurrent();
    await browser.windows.update(win.id, { focused: true });
    view.focus();
  } catch (err) {
    setState("Error: " + err.message, "err");
  }
});

window.addEventListener("message", (e) => {
  if (e.origin !== location.origin) return;
  if (e.data?.type === "save") save();
});

await browser.storage.session.set({ [editingKey]: hostname });

let queue = Promise.resolve();
function apply(css) {
  queue = queue.then(async () => {
    if (!isTabAlive || css === appliedCss) return;
    try {
      if (appliedCss) {
        await browser.scripting.removeCSS({ target: { tabId }, css: appliedCss, origin: "AUTHOR" });
        appliedCss = "";
      }
      if (css) {
        await browser.scripting.insertCSS({ target: { tabId }, css, origin: "AUTHOR" });
        appliedCss = css;
      }
      markAsUnsaved();
    } catch (err) {
      setState("Error: " + err.message, "err");
    }
  });
}

function markAsUnsaved() {
  if (getCss() !== savedCss) setState("Unsaved Changes", "warn")
    else setState();
}

let timer;
function onChange() {
  markAsUnsaved();
  clearTimeout(timer);
  timer = setTimeout(() => apply(getCss()), 150);
}

async function save() {
  const css = getCss();
  await browser.storage.local.set({ [key]: css });
  savedCss = css;
  apply(css);
  markAsUnsaved();
}

saveButton?.addEventListener("click", save);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.defaultPrevented) {
    e.preventDefault();
    save();
  }
});

browser.tabs.onUpdated.addListener((id, changeInfo, tab) => {
  if (id !== tabId || changeInfo.status !== "complete" || !tab.url) return;
  let host;
  try {
    host = new URL(tab.url).hostname;
  } catch {
    host = null;
  }
  if (host !== hostname) {
    isTabAlive = false;
    setState("Tab left " + hostname + ", preview paused", "warn");
    return;
  }
  isTabAlive = true;
  appliedCss = "";
  apply(getCss());
});

browser.tabs.onRemoved.addListener((id) => {
  if (id !== tabId) return;
  isTabAlive = false;
  setState("Tab was closed", "err");
});

window.addEventListener("beforeunload", (e) => {
  if (getCss() !== savedCss) e.preventDefault();
});

window.addEventListener("pagehide", () => {
  browser.runtime.sendMessage({
    type: "editor-closed",
    tabId,
    hostname,
    preview: isTabAlive ? appliedCss : null,
  });
});

markAsUnsaved();
view.focus();
