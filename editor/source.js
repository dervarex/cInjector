import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html } from "@codemirror/lang-html";
import { openSearchPanel, closeSearchPanel, searchPanelOpen } from "@codemirror/search";
import beautify from "js-beautify";
import { theme } from "./theme.js";
import { rememberScroll } from "./scroll.js";
import { pickElement, cancelPick, isPicking } from "./pick.js";

const params = new URLSearchParams(location.search);
const tabId = Number(params.get("tabId"));
const hostname = params.get("host");
const isEmbedded = window.top !== window;

const statusEl = document.getElementById("status");

document.title = `Source: ${hostname}`;

function setState(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = kind;
}

const view = new EditorView({
  parent: document.getElementById("source"),
  extensions: [
    basicSetup,
    EditorState.readOnly.of(true),
    html(),
    theme,
  ],
});

const restoreScroll = rememberScroll(view);

const MARKER = "data-cinjector-pick";

async function loadSource(takeMarker = false) {
  const [{ result }] = await browser.scripting.executeScript({
    target: { tabId },
    args: [MARKER, takeMarker],
    func: (marker, takeMarker) => {
      const source = document.documentElement.outerHTML;
      if (takeMarker) {
        for (const el of document.querySelectorAll(`[${marker}]`)) el.removeAttribute(marker);
      }
      return source;
    },
  });
  return beautify.html(result, {
    indent_size: 2,
    max_preserve_newlines: 1,
    wrap_line_length: 0,
  });
}

function setSource(text) {
  if (text === view.state.doc.toString()) return false;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
  return true;
}

async function refresh() {
  try {
    if (setSource(await loadSource())) restoreScroll();
    setState();
  } catch (err) {
    setState("Error: " + err.message, "err");
  }
}

async function showPicked() {
  try {
    let text = await loadSource(true);
    const attribute = ` ${MARKER}=""`;
    const index = text.indexOf(attribute);
    if (index === -1) {
      setState("Element not found in source", "warn");
      return;
    }
    text = text.slice(0, index) + text.slice(index + attribute.length);
    setSource(text);

    const from = text.lastIndexOf("<", index);
    const end = text.indexOf(">", index);
    const to = end === -1 ? index : end + 1;
    view.dispatch({
      selection: { anchor: from, head: to },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
    view.focus();
    setState();
  } catch (err) {
    setState("Error: " + err.message, "err");
  }
}

document.getElementById("refresh").addEventListener("click", refresh);

document.getElementById("search").addEventListener("click", () => {
  if (searchPanelOpen(view.state)) closeSearchPanel(view);
  else openSearchPanel(view);
});

const pickButton = document.getElementById("pick");

pickButton.addEventListener("click", async () => {
  try {
    if (isPicking()) {
      await cancelPick();
      setState();
      return;
    }
    setState("Click an element on the page");
    const picked = await pickElement(tabId, pickButton);
    setState();
    if (picked) showPicked();
  } catch (err) {
    setState("Error: " + err.message, "err");
  }
});

window.addEventListener("message", (e) => {
  if (e.origin === location.origin && e.data?.type === "refresh") refresh();
});

document.addEventListener("keydown", (e) => {
  if (isEmbedded && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    window.parent.postMessage({ type: "save" }, location.origin);
  }
});

refresh();
