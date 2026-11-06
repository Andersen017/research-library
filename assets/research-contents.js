/* Shared floating contents; source navigation remains the fallback. */
(() => {
  "use strict";
  const script = document.currentScript;
  const sourceSelector = script?.dataset.contentsSource;
  function init() {
    if (!sourceSelector || document.getElementById("rl-contents-button")) return;
    const source = document.querySelector(sourceSelector);
    if (!source) return;
    const seen = new Set();
    const items = Array.from(source.querySelectorAll('a[href^="#"]')).flatMap(link => {
      let id;
      try { id = decodeURIComponent(link.getAttribute("href").slice(1)); } catch { return []; }
      const target = document.getElementById(id);
      if (!target || seen.has(id)) return [];
      seen.add(id);
      const label = Array.from(link.childNodes, node => node.textContent.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ");
      return label ? [{ id, target, label, minor: link.matches(".toc-minor, .sub") }] : [];
    });
    if (!items.length) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "rl-contents-button";
    button.className = "rl-contents-button";
    button.setAttribute("aria-label", "Открыть содержание");
    button.title = "Содержание";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "rl-contents-panel");
    button.innerHTML = '<svg class="rl-contents-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/></svg><svg class="rl-contents-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    const panel = document.createElement("div");
    panel.id = "rl-contents-panel";
    panel.className = "rl-contents-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "rl-contents-heading");
    const heading = document.createElement("h2");
    heading.id = "rl-contents-heading";
    heading.className = "rl-contents-heading";
    heading.textContent = "Содержание";
    const nav = document.createElement("nav");
    nav.className = "rl-contents-nav";
    nav.setAttribute("aria-label", "Быстрый переход по исследованию");
    for (const item of items) {
      const link = document.createElement("a");
      link.href = "#" + encodeURIComponent(item.id);
      link.textContent = item.label;
      link.className = "rl-contents-link" + (item.minor ? " rl-contents-link--minor" : "");
      item.link = link;
      link.addEventListener("click", () => {
        for (let node = item.target.parentElement; node; node = node.parentElement) {
          if (node instanceof HTMLDetailsElement) node.open = true;
        }
        if (item.target instanceof HTMLDetailsElement) item.target.open = true;
        close(false);
        requestAnimationFrame(() => {
          const hadTabindex = item.target.hasAttribute("tabindex");
          if (!hadTabindex) item.target.setAttribute("tabindex", "-1");
          item.target.focus({ preventScroll: true });
          if (!hadTabindex) item.target.addEventListener("blur", () => item.target.removeAttribute("tabindex"), { once: true });
        });
      });
      nav.append(link);
    }
    panel.append(heading, nav);
    document.body.append(panel, button);
    // Preserve source markup and old handlers, but replace their floating controls.
    document.querySelectorAll("#tocBtn, #menuBtn, #floatingTocToggle").forEach(legacy => {
      legacy.setAttribute("data-rl-contents-legacy", "");
      const group = legacy.closest(".float, .floating");
      if (group) group.setAttribute("data-rl-contents-companions", "");
    });
    if (source.matches(".menu")) source.setAttribute("data-rl-contents-legacy", "");
    document.querySelector("#floatingToc")?.setAttribute("data-rl-contents-legacy", "");
    const orderedItems = [...items].sort((a, b) =>
      a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    function updateCurrent() {
      let current = orderedItems[0];
      for (const item of orderedItems) {
        if (item.target.getClientRects().length && item.target.getBoundingClientRect().top <= 125) current = item;
      }
      for (const item of items) {
        if (item === current) item.link.setAttribute("aria-current", "location");
        else item.link.removeAttribute("aria-current");
      }
      return current;
    }
    function close(restoreFocus) {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Открыть содержание");
      if (restoreFocus) button.focus({ preventScroll: true });
    }
    button.addEventListener("click", () => {
      if (!panel.hidden) return close(true);
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", "Закрыть содержание");
      const current = updateCurrent();
      current.link.focus({ preventScroll: true });
      current.link.scrollIntoView({ block: "nearest" });
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close(true);
      }
    }, true);
    document.addEventListener("pointerdown", event => {
      if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) close(false);
    });
    document.addEventListener("focusin", event => {
      if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) close(false);
    });
    let scheduled = false;
    function scheduleUpdate() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; updateCurrent(); });
    }
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    window.addEventListener("hashchange", scheduleUpdate);
    updateCurrent();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
