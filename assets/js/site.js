/*
 * Site-wide behavior shared by every content page:
 *   1. Google Analytics bootstrap (moved out of inline <head> scripts so the
 *      Content-Security-Policy can drop 'unsafe-inline' for scripts).
 *   2. Delegated GA event tracking via [data-ga-event] / [data-ga-params].
 *   3. Mobile menu + testimonial modal glue (formerly inline onclick handlers).
 *
 * DOM contract (verified by tests/site-contract.test.mjs):
 *   [data-action="toggle-menu" | "open-testimonial" | "close-testimonial"]
 *   [data-testimonial-overlay] closes the modal on backdrop clicks.
 */
(function () {
  'use strict';

  /* Fail-visible motion gate: editorial.css hides .reveal content only
     while <body data-motion-pending> is present. site.js loads after the
     GSAP CDN tags, so if GSAP never arrived nothing would ever reveal —
     drop the attribute and the page renders fully visible. */
  if ((!window.gsap || !window.ScrollTrigger) && document.body) {
    document.body.removeAttribute('data-motion-pending');
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  window.gtag('js', new Date());
  window.gtag('config', 'G-D11HKMWFB4');

  function track(eventName, params) {
    if (typeof window.gtag === 'function' && eventName) {
      window.gtag('event', eventName, params || {});
    }
  }

  function toggleMenu() {
    var menu = document.getElementById('mobile-menu');
    if (!menu) return;
    var isOpen = menu.classList.contains('translate-x-full');
    track('mobile_menu_toggled', { action: isOpen ? 'open' : 'close' });
    menu.classList.toggle('translate-x-full');
  }

  function openTestimonial(card) {
    var modal = document.getElementById('testimonial-modal');
    if (!modal) return;

    var name = card.getAttribute('data-name');
    var role = card.getAttribute('data-role');
    var image = card.getAttribute('data-image');
    var text = card.getAttribute('data-text');

    track('testimonial_opened', { testimonial_author: name || 'unknown' });

    document.getElementById('modal-name').textContent = name;
    document.getElementById('modal-role').textContent = role;

    var imgEl = document.getElementById('modal-image');
    var initialsEl = document.getElementById('modal-initials');

    if (image) {
      imgEl.src = image;
      imgEl.alt = 'Portrait of ' + name;
      imgEl.classList.remove('hidden');
      initialsEl.classList.add('hidden');
    } else {
      imgEl.classList.add('hidden');
      initialsEl.classList.remove('hidden');
      initialsEl.textContent = name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2);
    }

    document.getElementById('modal-text').textContent = text;
    modal.showModal();
  }

  function closeTestimonial() {
    var modal = document.getElementById('testimonial-modal');
    if (modal && modal.open) modal.close();
  }

  /* Theme toggle. theme.js already applied the stored theme to <html>
     before paint; here we sync the button face, flip + persist on click,
     and broadcast a 'themechange' event so canvas/SVG painters re-read
     their colors from the CSS custom properties. Light is the default. */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncThemeButton() {
    var dark = currentTheme() === 'dark';
    var btns = document.querySelectorAll('[data-action="toggle-theme"]');
    for (var i = 0; i < btns.length; i++) {
      var icon = btns[i].querySelector('.material-symbols-outlined');
      // Show the glyph for the theme the click switches TO.
      if (icon) icon.textContent = dark ? 'light_mode' : 'dark_mode';
      var label = dark ? 'Switch to light theme' : 'Switch to dark theme';
      btns[i].setAttribute('aria-label', label);
      btns[i].setAttribute('title', label);
      btns[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
  }

  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { window.localStorage.setItem('theme', next); } catch (err) { /* storage blocked */ }
    syncThemeButton();
    track('theme_toggled', { theme: next });
    window.dispatchEvent(new Event('themechange'));
  }

  syncThemeButton();

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    var tracked = target.closest('[data-ga-event]');
    if (tracked) {
      var params = {};
      var raw = tracked.getAttribute('data-ga-params');
      if (raw) {
        try { params = JSON.parse(raw); } catch (err) { params = {}; }
      }
      track(tracked.getAttribute('data-ga-event'), params);
    }

    var actionEl = target.closest('[data-action]');
    if (actionEl) {
      switch (actionEl.getAttribute('data-action')) {
        case 'toggle-menu': toggleMenu(); break;
        case 'toggle-theme': toggleTheme(); break;
        case 'open-testimonial': openTestimonial(actionEl); break;
        case 'close-testimonial': closeTestimonial(); break;
      }
      return;
    }

    // Backdrop click: only when the click landed on the overlay itself, not a child.
    if (target.hasAttribute('data-testimonial-overlay')) closeTestimonial();
  });
})();
