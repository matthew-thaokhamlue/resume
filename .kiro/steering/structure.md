# Project Structure & Organization

## Root Level Files
- `index.html` - Main homepage with navigation and content sections
- `portfolio.html` - Dedicated portfolio page with project showcases
- `README.md` - Project documentation and setup instructions
- `LICENSE.txt` - Creative Commons license for HTML5 UP template

## Asset Organization

### `/assets/` - All static assets
```
assets/
├── css/                    # Compiled stylesheets
│   ├── main.css           # Primary stylesheet (compiled from SASS)
│   ├── portfolio.css      # Portfolio-specific styles
│   ├── noscript.css       # Fallback styles for no-JS
│   └── fontawesome-all.min.css # Icon library
├── js/                     # JavaScript files
│   ├── main.js            # Primary application logic
│   ├── portfolio.js       # Portfolio page interactions
│   ├── jquery.min.js      # jQuery library
│   ├── browser.min.js     # Browser detection utilities
│   ├── breakpoints.min.js # Responsive breakpoint handling
│   └── util.js            # Utility functions
├── sass/                   # SASS source files
│   ├── base/              # Base styles (reset, typography, page)
│   ├── components/        # Reusable UI components
│   ├── layout/            # Layout-specific styles
│   ├── libs/              # SASS libraries and utilities
│   ├── main.scss          # Main SASS entry point
│   └── noscript.scss      # No-JS fallback styles
└── webfonts/              # Font Awesome font files
```

### `/images/` - Static images
- `bg.jpg` - Background image
- `overlay.png` - Overlay graphics
- `pic01.jpg` - Profile/about image
- `pic02.png` - Experience section image
- `pic03.png` - Skills section image
- `pic04.png` - Hobbies section image

## Code Organization Patterns

### HTML Structure
- Single-page application with article-based sections
- Semantic HTML5 elements (header, nav, main, article, footer)
- Responsive navigation with hash-based routing
- Consistent class naming following HTML5 UP conventions

### CSS/SASS Architecture
- **Base**: Reset, typography, and page-level styles
- **Components**: Reusable UI elements (buttons, forms, icons)
- **Layout**: Page structure and positioning
- **Libs**: SASS utilities, mixins, and variables

### JavaScript Organization
- jQuery-based DOM manipulation
- Modular approach with utility functions
- Responsive breakpoint handling
- Progressive enhancement patterns

## Naming Conventions
- **Files**: lowercase with hyphens (kebab-case)
- **CSS Classes**: lowercase with hyphens following BEM-like patterns
- **IDs**: camelCase for JavaScript targets
- **Images**: descriptive names with pic prefix for content images

## Content Structure
- **About**: Personal introduction and education
- **Experience**: Professional work history with detailed achievements
- **Skills**: Technical and product management capabilities
- **Portfolio**: Project showcases with detailed case studies
- **Hobbies**: Personal interests and cultural insights
- **Contact**: Contact form and social media links

## Responsive Design Approach
- Mobile-first responsive design
- Breakpoint-based layout adjustments
- Flexible grid system
- Scalable typography and spacing