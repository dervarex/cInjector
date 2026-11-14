async function getSavedCss(hostname) {
  const key = `css:${hostname}`;
  const result = await browser.storage.local.get(key);
  return result[key] || "";
}

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    return;
  }

  const editingKey = `editing:${tabId}`;
  const { [editingKey]: editingHost } = await browser.storage.session.get(editingKey);
  if (editingHost === hostname) return;

  const css = await getSavedCss(hostname);
  if (!css) return;

  try {
    await browser.scripting.insertCSS({
      target: { tabId },
      css,
      origin: "AUTHOR",
    });
  } catch (err) {
    console.error("insertCSS errored:", err);
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  browser.storage.session.remove(`editing:${tabId}`);
});

browser.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type !== "editor-closed") return;

  await browser.storage.session.remove(`editing:${msg.tabId}`);
  if (msg.preview === null) return;

  const saved = await getSavedCss(msg.hostname);
  if (msg.preview === saved) return;

  try {
    if (msg.preview) {
      await browser.scripting.removeCSS({ target: { tabId: msg.tabId }, css: msg.preview, origin: "AUTHOR" });
    }
    if (saved) {
      await browser.scripting.insertCSS({ target: { tabId: msg.tabId }, css: saved, origin: "AUTHOR" });
    }
  } catch (err) {
    console.error("restoring css errored:", err);
  }
});
