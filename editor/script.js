import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting } from "@codemirror/language";
import { css } from "@codemirror/lang-css";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";

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
    keymap.of([indentWithTab]),
    css(),
    syntaxHighlighting(oneDarkHighlightStyle),
    EditorView.theme({}, { dark: true }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange();
    }),
  ],
});

const getCss = () => view.state.doc.toString();

await browser.storage.session.set({ [editingKey]: hostname });

let queue = Promise.resolve();
function apply(css) {
  queue = queue.then(async () => {
    if (!isTabAlive || css === appliedCss) return;
    try {
      if (appliedCss) {
        await browser.scripting.removeCSS({ target: { tabId }, css: appliedCss, origin: "USER" });
        appliedCss = "";
      }
      if (css) {
        await browser.scripting.insertCSS({ target: { tabId }, css, origin: "USER" });
        appliedCss = css;
      }
      markAsUnsaved();
    } catch (err) {
      setState("Error: " + err.message, "err");
    }
  });
}

function markAsUnsaved() {
  if (getCss() !== savedCss) setState("unsaed changes", "warn");
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

saveButton.addEventListener("click", save);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
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
