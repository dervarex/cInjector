import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html } from "@codemirror/lang-html";
import { openSearchPanel, closeSearchPanel, searchPanelOpen } from "@codemirror/search";
import beautify from "js-beautify";
import { theme } from "./theme.js";
import { rememberScroll } from "./scroll.js";

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

async function refresh() {
  try {
    const [{ result }] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML,
    });
    const formatted = beautify.html(result, {
      indent_size: 2,
      max_preserve_newlines: 1,
      wrap_line_length: 0,
    });
    if (formatted !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: formatted } });
      restoreScroll();
    }
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
