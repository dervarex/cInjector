import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { syntaxHighlighting } from "@codemirror/language";
import { html } from "@codemirror/lang-html";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";

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
    syntaxHighlighting(oneDarkHighlightStyle),
    EditorView.theme({}, { dark: true }),
  ],
});

async function refresh() {
  try {
    const [{ result }] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML,
    });
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: result } });
    setState();
  } catch (err) {
    setState("Error: " + err.message, "err");
  }
}

document.getElementById("refresh").addEventListener("click", refresh);

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
