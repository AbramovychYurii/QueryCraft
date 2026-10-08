/*
 * Applies the saved theme and accent before first paint (docs/redesign §4.5).
 * chrome.storage is async, so the popup would flash the wrong scheme; this
 * reads the synchronous localStorage mirror that useTheme / useAccent keep.
 * Loaded as a file, not inline: the MV3 content security policy blocks inline scripts.
 */
try {
  var root = document.documentElement;
  var preference = localStorage.getItem('qc-theme');
  var dark =
    preference === 'dark' ||
    (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var scheme = dark ? 'dark' : 'light';
  root.classList.toggle('dark', dark);
  root.setAttribute('data-theme', scheme);
  root.style.colorScheme = scheme;

  var accent = JSON.parse(localStorage.getItem('qc-accent') || 'null');
  if (accent) {
    root.style.setProperty('--primary', accent.primary);
    root.style.setProperty('--primary-foreground', accent.primaryForeground);
    root.style.setProperty('--key-foreground', accent.keyForeground[scheme]);
  }
} catch (e) {
  // Storage blocked or malformed: the React hooks apply the theme a moment later.
}
