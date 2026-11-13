(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    document.getElementById("domain").textContent = "(no site)";
    document.getElementById("save").disabled = true;
    document.getElementById("open-editor").disabled = true;
    return;
  }

  document.getElementById("domain").textContent = hostname;

  document.getElementById("open-editor").addEventListener("click", async () => {
    const url = browser.runtime.getURL(
      `editor/editor.html?tabId=${tab.id}&host=${encodeURIComponent(hostname)}`
    );
    await browser.windows.create({ url, type: "popup", width: 560, height: 720 });
    window.close();
  });

  const key = `css:${hostname}`;
  const result = await browser.storage.local.get(key);
  document.getElementById("css").value = result[key] || "";

  document.getElementById("save").addEventListener("click", async () => {
    const css = document.getElementById("css").value;
    await browser.storage.local.set({ [key]: css });

    try {
      await browser.scripting.insertCSS({
        target: { tabId: tab.id },
        css,
        origin: "USER",
      });
      document.getElementById("status").textContent = "Saved & applied";
    } catch (err) {
      document.getElementById("status").textContent = "Error: " + err.message;
    }
  });
})();
