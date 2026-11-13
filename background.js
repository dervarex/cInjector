browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    return;
  }

  const key = `css:${hostname}`;
  const result = await browser.storage.local.get(key);
  const css = result[key];
  if (!css) return;

  try {
    await browser.scripting.insertCSS({
      target: { tabId },
      css,
      origin: "USER",
    });
  } catch (err) {
    console.error("insertCSS errored:", err);
  }
});
