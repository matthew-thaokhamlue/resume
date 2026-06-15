/*
 * theme.js — applies the saved color theme to <html> before first paint.
 *
 * Loaded synchronously in <head> (it is a same-origin 'self' script, so it
 * is allowed by the CSP that forbids inline scripts). Light is the default:
 * with no stored choice the page renders the :root (light) palette, so no-JS
 * and first-time visitors get light. A returning visitor who chose dark gets
 * data-theme="dark" set here, before the body paints — no flash of light.
 *
 * The toggle button, icon sync, persistence, and the 'themechange' event all
 * live in site.js (which runs after the DOM is ready).
 */
(function () {
  'use strict';
  var theme = 'light';
  try {
    var stored = window.localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') theme = stored;
  } catch (err) { /* storage blocked — fall back to light */ }
  document.documentElement.setAttribute('data-theme', theme);
})();
