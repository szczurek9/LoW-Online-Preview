// Komunikat o wersji Preview — pokazuje się po wejściu na stronę (raz na sesję karty).
(function () {
  "use strict";

  const SESSION_KEY = "low-preview-notice-seen";
  const notice = document.getElementById("preview-notice");
  const okButton = document.getElementById("preview-notice-ok");
  if (!notice || !okButton) return;

  let previouslyFocused = null;

  function alreadySeen() {
    try { return window.sessionStorage.getItem(SESSION_KEY) === "1"; } catch (error) { return false; }
  }

  function markSeen() {
    try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch (error) { /* brak storage — komunikat pokaże się ponownie */ }
  }

  function close() {
    notice.classList.add("hidden");
    document.removeEventListener("keydown", onKeyDown, true);
    markSeen();
    if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      // Prosty focus trap: w oknie są tylko link i przycisk.
      const focusable = notice.querySelectorAll("a[href], button");
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

  function open() {
    previouslyFocused = document.activeElement;
    notice.classList.remove("hidden");
    document.addEventListener("keydown", onKeyDown, true);
    okButton.focus();
  }

  okButton.addEventListener("click", close);
  notice.addEventListener("click", function (event) {
    if (event.target === notice) close();
  });

  if (!alreadySeen()) open();
})();
