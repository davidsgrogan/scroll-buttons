// Scroll and focus log for the issue #4 screen reader scrolling tests.
//
// The log is deliberately not a live region: it must not interrupt the screen
// reader while the tester moves through the cards.
(() => {
  const scroller = document.querySelector(".scroller");
  const status = document.getElementById("status");
  const log = document.getElementById("log");
  const copyResult = document.getElementById("copy-result");
  const cards = [...scroller.querySelectorAll(".card")];
  const horizontal = scroller.classList.contains("horizontal");
  const startTime = performance.now();
  let lastDescription = "";
  let timer = 0;

  function list(names) {
    return names.length ? names.join(", ") : "none";
  }

  function describe() {
    const rect = scroller.getBoundingClientRect();
    // The visible area, excluding borders and scroll bars.
    const left = rect.left + scroller.clientLeft;
    const top = rect.top + scroller.clientTop;
    const right = left + scroller.clientWidth;
    const bottom = top + scroller.clientHeight;
    const full = [];
    const partial = [];
    for (const card of cards) {
      const b = card.getBoundingClientRect();
      const overlaps = b.right > left + 1 && b.left < right - 1 &&
                       b.bottom > top + 1 && b.top < bottom - 1;
      if (!overlaps) continue;
      const inside = b.left >= left - 1 && b.right <= right + 1 &&
                     b.top >= top - 1 && b.bottom <= bottom + 1;
      (inside ? full : partial).push(card.dataset.name);
    }
    const pos = horizontal ? scroller.scrollLeft : scroller.scrollTop;
    const max = horizontal ? scroller.scrollWidth - scroller.clientWidth
                           : scroller.scrollHeight - scroller.clientHeight;
    const percent = max > 0 ? Math.round((pos / max) * 100) : 0;
    let text = `Scrolled ${percent}% (${Math.round(pos)} of ${max} pixels). ` +
               `Fully visible: ${list(full)}.`;
    if (partial.length) text += ` Partly visible: ${list(partial)}.`;
    return text;
  }

  function addEntry(text) {
    const seconds = ((performance.now() - startTime) / 1000).toFixed(1);
    const item = document.createElement("li");
    item.textContent = `At ${seconds} seconds: ${text}`;
    log.append(item);
  }

  function recordPosition(prefix) {
    const description = describe();
    status.textContent = description;
    if (description === lastDescription) return;
    lastDescription = description;
    addEntry(`${prefix} ${description}`);
  }

  // Record once scrolling has settled. A debounce works in every browser,
  // unlike the scrollend event.
  scroller.addEventListener("scroll", () => {
    clearTimeout(timer);
    timer = setTimeout(() => recordPosition("Scrolling stopped."), 250);
  });

  scroller.addEventListener("focusin", (event) => {
    const target = event.target;
    if (target === scroller) {
      addEntry("Focus moved to the scroll container itself.");
      return;
    }
    const card = target.closest(".card");
    const where = card ? ` in ${card.dataset.name}` : "";
    const name = target.textContent.trim() || target.tagName.toLowerCase();
    addEntry(`Focus moved to \u201c${name}\u201d${where}.`);
  });

  document.getElementById("reset").addEventListener("click", () => {
    clearTimeout(timer);
    scroller.scrollTo({ left: 0, top: 0, behavior: "instant" });
    log.replaceChildren();
    lastDescription = "";
    copyResult.textContent = "";
    // Let the scroll position settle before recording it.
    requestAnimationFrame(() => recordPosition("Reset."));
  });

  document.getElementById("copy-log").addEventListener("click", async () => {
    const lines = [
      document.title,
      `URL: ${location.href}`,
      `User agent: ${navigator.userAgent}`,
      ...[...log.children].map((item, i) => `${i + 1}. ${item.textContent}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      copyResult.textContent = "Log copied.";
    } catch (e) {
      copyResult.textContent = `Could not copy the log: ${e.message}`;
    }
  });

  recordPosition("Page loaded.");
})();
