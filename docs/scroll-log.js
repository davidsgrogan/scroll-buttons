// Scroll and focus log for the issue #4 screen reader scrolling tests.
// Deliberately not a live region, so it never interrupts the screen reader.
(() => {
  const scroller = document.querySelector(".scroller");
  const log = document.getElementById("log");
  const copyResult = document.getElementById("copy-result");
  const cards = [...scroller.querySelectorAll(".card")];
  const horizontal = scroller.classList.contains("horizontal");
  const startTime = performance.now();
  let lastDescription = "";
  const canReportSnaps = "onscrollsnapchange" in window;

  function position() {
    return horizontal ? scroller.scrollLeft : scroller.scrollTop;
  }

  function percent(pos) {
    const max = horizontal ? scroller.scrollWidth - scroller.clientWidth
                           : scroller.scrollHeight - scroller.clientHeight;
    return max > 0 ? Math.round((pos / max) * 100) : 0;
  }

  // Returns "" if the page doesn't snap, otherwise whether the current
  // position is a snap position. All cards here use scroll-snap-align: start.
  function snapText() {
    if (getComputedStyle(scroller).scrollSnapType === "none") return "";
    const max = horizontal ? scroller.scrollWidth - scroller.clientWidth
                           : scroller.scrollHeight - scroller.clientHeight;
    const pos = position();
    const origin = horizontal ? scroller.getBoundingClientRect().left + scroller.clientLeft
                              : scroller.getBoundingClientRect().top + scroller.clientTop;
    for (const [i, card] of cards.entries()) {
      if (getComputedStyle(card).scrollSnapAlign === "none") continue;
      const b = card.getBoundingClientRect();
      const offset = Math.min(max, pos + (horizontal ? b.left : b.top) - origin);
      if (Math.abs(offset - pos) <= 1) return ` On snap point, card ${i + 1}.`;
    }
    return " Not on a snap point.";
  }

  function visibleCards() {
    const r = scroller.getBoundingClientRect();
    const left = r.left + scroller.clientLeft;
    const top = r.top + scroller.clientTop;
    const right = left + scroller.clientWidth;
    const bottom = top + scroller.clientHeight;
    const full = [];
    const partial = [];
    for (const [i, card] of cards.entries()) {
      const b = card.getBoundingClientRect();
      const overlaps = b.right > left + 1 && b.left < right - 1 &&
                       b.bottom > top + 1 && b.top < bottom - 1;
      if (!overlaps) continue;
      const inside = b.left >= left - 1 && b.right <= right + 1 &&
                     b.top >= top - 1 && b.bottom <= bottom + 1;
      (inside ? full : partial).push(i + 1);
    }
    let text = `Cards ${full.join(", ") || "none"}`;
    if (partial.length) text += `, partly ${partial.join(", ")}`;
    return text + ".";
  }

  function addEntry(text) {
    const seconds = ((performance.now() - startTime) / 1000).toFixed(1);
    const item = document.createElement("li");
    item.textContent = `${seconds}s: ${text}`;
    log.append(item);
  }

  function recordPosition() {
    let text = `${percent(position())}%. ${visibleCards()}${snapText()}`;
    if (snappedTo) text = `Snapped to card ${snappedTo}. ${text}`;
    snappedTo = 0;
    if (text === lastDescription) return;
    lastDescription = text;
    addEntry(text);
  }

  // scrollend fires after the user lets go and any snapping has finished.
  let resetting = false;
  scroller.addEventListener("scrollend", () => {
    resetting = false;
    recordPosition();
  });

  // scrollsnapchange fires (before scrollend, in Chrome) when snapping picks a
  // different snap target. It also fires when the page first lays out, and
  // with a null target when the container comes to rest off any snap point;
  // neither is a snap, so both are ignored. Only some browsers support it.
  let hasScrolled = false;
  let snappedTo = 0;
  scroller.addEventListener("scroll", () => { hasScrolled = true; });
  scroller.addEventListener("scrollsnapchange", (event) => {
    const target = horizontal ? event.snapTargetInline : event.snapTargetBlock;
    if (hasScrolled && !resetting && target) snappedTo = cards.indexOf(target) + 1;
  });

  scroller.addEventListener("focusin", (event) => {
    const card = event.target.closest(".card");
    addEntry(card ? `Focus in card ${cards.indexOf(card) + 1}.`
                  : "Focus on scroller.");
  });

  scroller.addEventListener("focusout", (event) => {
    // Moving focus between things inside the scroller isn't leaving it.
    if (event.relatedTarget && scroller.contains(event.relatedTarget)) return;
    // Switching windows or apps also blurs the scroller; say so.
    setTimeout(() => {
      addEntry(document.hasFocus() ? "Focus left scroller."
                                   : "Focus left scroller (window lost focus).");
    });
  });

  function start() {
    if (!canReportSnaps) addEntry("This browser can't report snapping.");
    recordPosition();
  }

  document.getElementById("reset").addEventListener("click", () => {
    log.replaceChildren();
    lastDescription = "";
    snappedTo = 0;
    copyResult.textContent = "";
    if (position() === 0) {
      start();
      return;
    }
    // The scrollend handler records the start position once it's reached.
    if (!canReportSnaps) addEntry("This browser can't report snapping.");
    resetting = true;
    scroller.scrollTo({ left: 0, top: 0, behavior: "instant" });
  });

  document.getElementById("copy-log").addEventListener("click", async () => {
    const lines = [
      document.title,
      navigator.userAgent,
      ...[...log.children].map((item) => item.textContent),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      copyResult.textContent = "Copied.";
    } catch (e) {
      copyResult.textContent = `Copy failed: ${e.message}`;
    }
  });

  start();
})();
