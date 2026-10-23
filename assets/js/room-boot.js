/*
 * room-boot.js — the gate for the 3D room on the home page (step 1, behind ?room=1).
 *
 * Loaded in <head> right after theme.js. Without room=1 in the query it does nothing,
 * so no file under assets/room/ loads. With room=1 the room runs only with a fine
 * pointer, a window of at least 761 x 500 px, no reduced-motion request, and WebGL 2
 * on a hardware renderer. force=1 skips the renderer check only, for headless tests.
 * When a check fails, the home page stays as it is. When all pass, html.room-on shows
 * #room at once, and the module loads after DOMContentLoaded. If the module, the
 * renderer, a model, the view or the experience.html fetch fails, the room hides again.
 */
(() => {
  'use strict';
  if (!/[?&]room=1\b/.test(window.location.search)) return;

  const root = document.documentElement;
  const force = /[?&]force=1\b/.test(window.location.search);
  const SOFTWARE = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render/i;

  // Probes on a throwaway canvas: a canvas keeps the attributes of its first getContext call.
  function hasWebGL2() {
    const gl = document.createElement('canvas').getContext('webgl2', force ? undefined : { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return force || !SOFTWARE.test(name);
  }

  const why =
    !window.matchMedia('(pointer: fine)').matches ? 'no fine pointer'
    : window.innerWidth < 761 || window.innerHeight < 500 ? 'the window is smaller than 761 x 500 px'
    : window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced motion is on'
    : !hasWebGL2() ? 'no WebGL 2 on a hardware renderer'
    : '';
  if (why) {
    console.warn(`Room: ${why}, so the home page shows without the room.`);
    return;
  }
  root.classList.add('room-on');

  function fail(section, error) {
    root.classList.remove('room-on');
    if (section) section.hidden = true;
    console.warn('Room: the room failed to start, so the home page shows without it.', error);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const section = document.getElementById('room');
    if (!section) { fail(null, new Error('#room is missing')); return; }
    section.hidden = false;
    import(new URL('assets/room/room.js?v=20261023-review', document.baseURI).href)
      .then((room) => room.start(section))
      .catch((error) => fail(section, error));
  });
})();
