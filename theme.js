/* =========================================================
   WAYMARK — Theme Management
   Auto-detect prefers-color-scheme → localStorage
   ========================================================= */

function detectTheme() {
  const saved = localStorage.getItem('waymark_theme');
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
  localStorage.setItem('waymark_theme', theme);
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// Listen for system theme changes (only if user hasn't set preference)
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('waymark_theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

// Apply immediately (before DOMContentLoaded to prevent flash)
applyTheme(currentTheme);

// Export
window.toggleTheme = toggleTheme;
window.getCurrentTheme = () => currentTheme;
window.applyTheme = applyTheme;