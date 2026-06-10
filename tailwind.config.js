/**
 * Dev-time config for regenerating assets/css/tailwind.css (the site itself has
 * no build step — the compiled stylesheet is checked in).
 *
 * Regenerate after adding/removing Tailwind classes in any HTML/JS file
 * (NODE_PATH makes the npx-cached plugins resolvable from this config):
 *   NODE_PATH="$(npm root -g 2>/dev/null):$HOME/.npm/_npx/cd0d0a527b76e5c2/node_modules" \
 *   npx -y -p tailwindcss@3.4.17 -p @tailwindcss/forms@0.5.10 \
 *     -p @tailwindcss/container-queries@0.1.1 \
 *     tailwindcss -c tailwind.config.js -i assets/css/tailwind.src.css \
 *     -o assets/css/tailwind.css --minify
 *
 * Theme tokens here are the single source of truth (the per-page inline
 * tailwind.config blocks were removed with the Play CDN in June 2026).
 */
module.exports = {
  darkMode: 'class',
  content: ['./*.html', './portfolio/*.html', './assets/js/*.js'],
  theme: {
    extend: {
      colors: {
        'primary': '#0da6f2',
        'primary-dark': '#0a8ccf',
        'background-light': '#f5f7f8',
        'background-dark': '#101c22',
        'surface': '#1a262d',
        'surface-hover': '#233038',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};
