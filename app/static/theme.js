(() => {
  const modes = ['light', 'dark', 'system'];
  const storageKey = 'socialtrade_theme';
  const root = document.documentElement;
  const controls = [...document.querySelectorAll('[data-theme-mode]')];
  const systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
  let savedMode = 'system';
  let selectedMode = 'system';

  try {
    const storedMode = localStorage.getItem(storageKey);
    if (modes.includes(storedMode)) savedMode = storedMode;
  } catch (_) {}

  const setMode = mode => {
    if (!modes.includes(mode)) return;
    selectedMode = mode;
    const resolvedMode = mode === 'system' ? (systemPreference.matches ? 'dark' : 'light') : mode;
    root.dataset.theme = resolvedMode;
    root.style.colorScheme = resolvedMode;
    controls.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeMode === mode));
    });
    try { localStorage.setItem(storageKey, mode); } catch (_) {}
  };

  controls.forEach(button => button.addEventListener('click', () => setMode(button.dataset.themeMode)));
  systemPreference.addEventListener('change', () => {
    if (selectedMode === 'system') setMode('system');
  });
  setMode(savedMode);
})();
