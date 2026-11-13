const params = new URLSearchParams(location.search);
const tabId = Number(params.get("tabId"));
const hostname = params.get("host");
const key = `css:${hostname}`;
const editingKey = `editing:${tabId}`;

const textarea = document.getElementById("css");
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

textarea.value = stored;

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
  if (textarea.value !== savedCss) setState("unsaed changes", "warn");
}

let timer;
textarea.addEventListener("input", () => {
  markAsUnsaved();
  clearTimeout(timer);
  timer = setTimeout(() => apply(textarea.value), 150);
});

textarea.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    textarea.setRangeText("  ", textarea.selectionStart, textarea.selectionEnd, "end");
    textarea.dispatchEvent(new Event("input"));
  }
});

async function save() {
  const css = textarea.value;
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
  apply(textarea.value);
});

browser.tabs.onRemoved.addListener((id) => {
  if (id !== tabId) return;
  isTabAlive = false;
  setState("Tab was closed", "err");
});

window.addEventListener("beforeunload", (e) => {
  if (textarea.value !== savedCss) e.preventDefault();
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
textarea.focus();
