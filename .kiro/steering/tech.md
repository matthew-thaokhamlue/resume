# Technology Stack & Build System

## Core Technologies
- **HTML5**: Semantic markup with modern HTML5 standards
- **CSS3**: Responsive design with Flexbox and CSS Grid
- **JavaScript**: ES5+ with jQuery for DOM manipulation
- **SASS/SCSS**: CSS preprocessing for maintainable stylesheets

## Frontend Framework
- **HTML5 UP Dimension Template**: Professional single-page application template
- **jQuery**: DOM manipulation and event handling
- **Font Awesome**: Icon library for UI elements
- **Google Fonts**: Source Sans Pro typography

## Build System
- **No build process required**: Static site with direct file serving
- **SASS compilation**: Manual compilation of SCSS to CSS (if needed)
- **Asset optimization**: Minified CSS and JS files included

## Development Workflow
```bash
# Local development - simply open in browser
open index.html

# For SASS development (if modifying styles)
sass --watch assets/sass/main.scss:assets/css/main.css
```

## Deployment
- **GitHub Pages**: Static hosting directly from repository
- **No server requirements**: Pure client-side application
- **Automatic deployment**: Push to main branch triggers deployment

## File Structure Conventions
- `/assets/css/` - Compiled stylesheets and vendor CSS
- `/assets/js/` - JavaScript files (jQuery, utilities, main logic)
- `/assets/sass/` - SASS source files organized by components
- `/assets/webfonts/` - Font Awesome font files
- `/images/` - Static images and graphics

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive breakpoints: xxsmall (360px) to xlarge (1680px)
- Progressive enhancement approach

## Performance Considerations
- Minified CSS and JavaScript files
- Optimized images
- Font loading optimization
- Minimal external dependencies