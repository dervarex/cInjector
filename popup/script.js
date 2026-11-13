(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    document.getElementById("domain").textContent = "(no site)";
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
})();
