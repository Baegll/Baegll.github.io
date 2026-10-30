// Shared by portfolio, writing, and project tools. Tokens are rendered at build time.
(function () {
  function applyTheme(theme) {
    document.documentElement.setAttribute("saved-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }
  let stored;
  try { stored = localStorage.getItem("theme"); } catch {}
  applyTheme(stored === "light" ? "light" : "dark");
  window.toggleTheme = function () {
    const theme = document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark";
    applyTheme(theme);
    try { localStorage.setItem("theme", theme); } catch {}
  };
  window.addEventListener("storage", function (event) {
    if (event.key === "theme") applyTheme(event.newValue === "light" ? "light" : "dark");
  });
})();
