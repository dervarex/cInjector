let pending = null;

browser.runtime.onMessage.addListener((msg, sender) => {
  if (!pending || sender.tab?.id !== pending.tabId) return;
  if (msg?.type === "element-picked") finish(msg);
  else if (msg?.type === "pick-cancelled") finish(null);
});

function finish(result) {
  const current = pending;
  pending = null;
  current.button?.classList.remove("active");
  current.resolve(result);
}

export function isPicking() {
  return pending !== null;
}

export async function pickElement(tabId, button) {
  if (pending) await cancelPick();
  await browser.scripting.executeScript({ target: { tabId }, files: ["/editor/picker.js"] });
  button?.classList.add("active");
  return new Promise((resolve) => {
    pending = { tabId, button, resolve };
  });
}

export async function cancelPick() {
  if (!pending) return;
  const { tabId } = pending;
  finish(null);
  await browser.scripting.executeScript({
    target: { tabId },
    func: () => window.__cinjectorPicker?.stop(),
  });
}
