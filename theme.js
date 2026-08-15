/* =========================================================
   WAYMARK — Theme Management
   Auto-detect prefers-color-scheme → sessionStorage
   ========================================================= */

function detectTheme() {
  const saved = sessionStorage.getItem('waymark_theme');
  if (saved) return saved;
  if (window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

let currentTheme = detectTheme();

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  sessionStorage.setItem('waymark_theme', theme);

  if (window.refreshMapTheme) {
    window.refreshMapTheme(theme);
  }
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!sessionStorage.getItem('waymark_theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

applyTheme(currentTheme);

window.toggleTheme = toggleTheme;
window.getCurrentTheme = () => currentTheme;
window.applyTheme = applyTheme;