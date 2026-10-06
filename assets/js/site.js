/*
 * Site-wide behavior shared by every content page:
 *   1. Cookie-consent banner + consent-gated Google Analytics: gtag.js is
 *      injected only after an explicit "Accept" (GDPR opt-in). The choice
 *      ('accepted' | 'dismissed') lives in localStorage; the footer
 *      "Cookie preferences" control clears it to re-open the banner.
 *   2. Delegated GA event tracking via [data-ga-event] / [data-ga-params].
 *   3. Mobile menu + testimonial modal glue (formerly inline onclick handlers).
 *
 * DOM contract (verified by tests/site-contract.test.mjs):
 *   [data-action="toggle-menu" | "open-testimonial" | "close-testimonial"
 *     | "cookie-accept" | "cookie-dismiss" | "cookie-preferences"]
 *   [data-action="open-reveal"][data-reveal] opens the dialog with that id.
 *   [data-testimonial-overlay] closes the modal on backdrop clicks.
 */
(function () {
  'use strict';

  /* window.gtag stays undefined until the visitor accepts, so every track()
     call here (and the identical guard in ai-match.js) is a no-op before
     consent — nothing is queued and later flushed to GA. Withdrawing consent
     only blocks future loads; an already-loaded gtag persists until the next
     page load. */
  var CONSENT_KEY = 'resume_cookie_consent';
  var CONSENT_EVENT = 'resume_cookie_consent_change';
  var GA_ID = 'G-D11HKMWFB4';
  var gaLoaded = false;

  function readConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (err) { return null; }
  }

  function writeConsent(value) {
    try {
      if (value) window.localStorage.setItem(CONSENT_KEY, value);
      else window.localStorage.removeItem(CONSENT_KEY);
    } catch (err) { /* storage blocked: treated as no choice, banner re-shows */ }
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  function loadAnalytics() {
    if (gaLoaded || readConsent() !== 'accepted') return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(script);
  }

  function renderConsentBanner() {
    var banner = document.getElementById('cookie-consent-banner');
    if (readConsent()) {
      if (banner) banner.remove();
      return;
    }
    if (banner) return;

    banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie consent');

    var text = document.createElement('p');
    text.className = 'cookie-consent__text';
    text.textContent = 'This site only sets Google Analytics cookies if you accept. ' +
      'Your choice is saved in this browser and can be changed anytime via ' +
      '“Cookie preferences” in the footer.';

    var actions = document.createElement('div');
    actions.className = 'cookie-consent__actions';

    var accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'cookie-consent__btn cookie-consent__btn--accept';
    accept.setAttribute('data-action', 'cookie-accept');
    accept.textContent = 'Accept';

    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'cookie-consent__btn';
    dismiss.setAttribute('data-action', 'cookie-dismiss');
    dismiss.textContent = 'Dismiss';

    actions.appendChild(accept);
    actions.appendChild(dismiss);
    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);
    // A page that fits the window reserves the banner's height, so the footer stays in view (editorial.css).
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(function () {
        document.documentElement.style.setProperty('--ed-consent-h', banner.offsetHeight + 'px');
      }).observe(banner);
    }
  }

  function onConsentChange() {
    renderConsentBanner();
    loadAnalytics();
  }

  window.addEventListener(CONSENT_EVENT, onConsentChange);
  window.addEventListener('storage', function (event) {
    if (!event.key || event.key === CONSENT_KEY) onConsentChange();
  });
  onConsentChange();

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

  /* Reveals: [data-action="open-reveal"][data-reveal="<id>"] opens
     <dialog class="ed-reveal" id="<id>"> with showModal(). A click anywhere
     in an open reveal closes it, except on a link, on a video, or while text
     is selected. Esc closes it natively, and the browser returns focus to the
     opener. A URL fragment that names a reveal, or an element inside one, opens it. */
  function openReveal(id) {
    var dialog = id ? document.getElementById(id) : null;
    if (!dialog || dialog.open || typeof dialog.showModal !== 'function') return;
    dialog.showModal();
    var video = dialog.querySelector('video');
    // play() rejects without a click (a deep link) or on a close during loading; the play button still works.
    if (video && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(function () {});
    track('reveal_opened', { reveal_id: id });
  }

  // 'close' does not bubble.
  document.addEventListener('close', function (event) {
    var video = event.target.querySelector('video');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, true);

  function openRevealFromHash() {
    var id = '';
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (err) { return; }
    var el = id ? document.getElementById(id) : null;
    var dialog = el ? el.closest('dialog.ed-reveal') : null;
    if (dialog) openReveal(dialog.id);
  }

  openRevealFromHash();
  window.addEventListener('hashchange', openRevealFromHash);

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

    var openedReveal = target.closest('dialog.ed-reveal[open]');
    if (openedReveal) {
      if (target.closest('.ed-reveal__close') || (!target.closest('a, video') && !String(window.getSelection() || '').trim())) openedReveal.close();
      return;
    }

    var actionEl = target.closest('[data-action]');
    if (actionEl) {
      switch (actionEl.getAttribute('data-action')) {
        case 'toggle-menu': toggleMenu(); break;
        case 'toggle-theme': toggleTheme(); break;
        case 'open-testimonial': openTestimonial(actionEl); break;
        case 'close-testimonial': closeTestimonial(); break;
        case 'open-reveal': openReveal(actionEl.getAttribute('data-reveal')); break;
        case 'cookie-accept': writeConsent('accepted'); break;
        case 'cookie-dismiss': writeConsent('dismissed'); break;
        case 'cookie-preferences': writeConsent(null); break;
      }
      return;
    }

    // Backdrop click: only when the click landed on the overlay itself, not a child.
    if (target.hasAttribute('data-testimonial-overlay')) closeTestimonial();
  });
})();
