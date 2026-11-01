// Komunikat o wersji Preview — pokazuje się po wejściu na stronę (raz na sesję karty).
// Przycisk "Co jest w Preview?" otwiera drugie okno z treścią wczytywaną z data/preview.md (Markdown).
(function () {
  "use strict";

  const SESSION_KEY = "low-preview-notice-seen";
  const DATA_URL = "data/preview.md";

  const notice = document.getElementById("preview-notice");
  const okButton = document.getElementById("preview-notice-ok");
  const detailsButton = document.getElementById("preview-notice-details-btn");
  const details = document.getElementById("preview-details");
  const detailsClose = document.getElementById("preview-details-close");
  const detailsBack = document.getElementById("preview-details-back");
  const detailsBody = document.getElementById("preview-details-body");
  if (!notice || !okButton) return;

  let previouslyFocused = null;
  let detailsLoaded = false;

  function alreadySeen() {
    try { return window.sessionStorage.getItem(SESSION_KEY) === "1"; } catch (error) { return false; }
  }

  function markSeen() {
    try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch (error) { /* brak storage — komunikat pokaże się ponownie */ }
  }

  function isOpen(element) {
    return element && !element.classList.contains("hidden");
  }

  // Zwraca okno, które jest teraz na wierzchu.
  function activeModal() {
    return isOpen(details) ? details : notice;
  }

  function closeNotice() {
    notice.classList.add("hidden");
    if (details) details.classList.add("hidden");
    document.removeEventListener("keydown", onKeyDown, true);
    markSeen();
    if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
  }

  function onKeyDown(event) {
    const modal = activeModal();
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (modal === details) closeDetails(); else closeNotice();
    } else if (event.key === "Tab") {
      const focusable = modal.querySelectorAll("a[href], button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function openNotice() {
    previouslyFocused = document.activeElement;
    notice.classList.remove("hidden");
    document.addEventListener("keydown", onKeyDown, true);
    okButton.focus();
  }

  // ---- Okno "Co jest w Preview?" ----

  // Mały, bezpieczny parser Markdowna: nagłówki (#, ##, ###), listy (-, *, 1.),
  // akapity, ---, **pogrubienie**, *kursywa*, `kod` i [linki](https://...).
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function inline(text) {
    let html = escapeHtml(text);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|[^*])\*([^*\s][^*]*)\*(?!\*)/g, "$1<em>$2</em>");
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, url) {
      // Tylko http(s) i linki względne — żadnych javascript: itp.
      if (!/^(https?:\/\/|\/|#)/i.test(url)) return label;
      const external = /^https?:/i.test(url);
      return '<a href="' + url + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + label + "</a>";
    });
    return html;
  }

  function markdownToHtml(source) {
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let paragraph = [];
    let list = null; // "ul" | "ol"

    function flushParagraph() {
      if (paragraph.length) out.push("<p>" + inline(paragraph.join(" ")) + "</p>");
      paragraph = [];
    }

    function closeList() {
      if (list) out.push("</" + list + ">");
      list = null;
    }

    lines.forEach(function (line) {
      const trimmed = line.trim();
      let m;

      if (!trimmed) { flushParagraph(); closeList(); return; }

      if ((m = trimmed.match(/^(#{1,4})\s+(.*)$/))) {
        flushParagraph(); closeList();
        out.push("<h" + (m[1].length + 2) + ">" + inline(m[2]) + "</h" + (m[1].length + 2) + ">");
        return;
      }

      if (/^(-{3,}|\*{3,})$/.test(trimmed)) { flushParagraph(); closeList(); out.push("<hr>"); return; }

      if ((m = trimmed.match(/^[-*+]\s+(.*)$/))) {
        flushParagraph();
        if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
        out.push("<li>" + inline(m[1]) + "</li>");
        return;
      }

      if ((m = trimmed.match(/^\d+[.)]\s+(.*)$/))) {
        flushParagraph();
        if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
        out.push("<li>" + inline(m[1]) + "</li>");
        return;
      }

      closeList();
      paragraph.push(trimmed);
    });

    flushParagraph();
    closeList();
    return out.join("\n");
  }

  function loadDetails() {
    if (detailsLoaded) return;
    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.text();
      })
      .then(function (text) {
        detailsBody.innerHTML = markdownToHtml(text) || "Brak informacji.";
        detailsLoaded = true;
      })
      .catch(function () {
        detailsBody.textContent = "Nie udało się wczytać listy. Spróbuj ponownie później.";
      });
  }

  function openDetails() {
    notice.classList.add("hidden");
    details.classList.remove("hidden");
    loadDetails();
    detailsBack.focus();
  }

  function closeDetails() {
    details.classList.add("hidden");
    notice.classList.remove("hidden");
    if (detailsButton) detailsButton.focus(); else okButton.focus();
  }

  okButton.addEventListener("click", closeNotice);
  notice.addEventListener("click", function (event) {
    if (event.target === notice) closeNotice();
  });

  if (detailsButton && details && detailsBody) {
    detailsButton.addEventListener("click", openDetails);
    if (detailsClose) detailsClose.addEventListener("click", closeDetails);
    if (detailsBack) detailsBack.addEventListener("click", closeDetails);
    details.addEventListener("click", function (event) {
      if (event.target === details) closeDetails();
    });
  }

  if (!alreadySeen()) openNotice();
})();
