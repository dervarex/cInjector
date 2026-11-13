(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    document.getElementById("domain").textContent = "(no site)";
    document.getElementById("save").disabled = true;
    return;
  }

  document.getElementById("domain").textContent = hostname;

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
