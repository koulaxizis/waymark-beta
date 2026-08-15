/* =========================================================
   WAYMARK — Theme Management
   Auto-detect prefers-color-scheme → sessionStorage
   No coupling with map layers anymore.
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

  // Removed: no more automatic map layer switching
  // The user's map layer choice is now completely independent
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// Listen for system theme changes (only if user hasn't set preference)
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!sessionStorage.getItem('waymark_theme')) {
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