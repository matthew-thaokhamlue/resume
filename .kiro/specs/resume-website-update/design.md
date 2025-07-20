# Design Document

## Overview

The resume website will be built using the existing HTML5 UP Dimension template as the foundation, with content updated to reflect Matthew Thaokhamlue's professional profile. The design maintains the template's modern, responsive layout while implementing a client-side email solution for the contact form functionality.

## Architecture

### Frontend Structure

- **Single Page Application (SPA)**: Utilizes the existing Dimension template's modal-based navigation
- **Portfolio Page**: Separate HTML page with consistent styling and hash-based routing
- **Responsive Design**: CSS Grid and Flexbox for mobile-first responsive layout
- **Progressive Enhancement**: Core content accessible without JavaScript, enhanced functionality with JS

### Email Integration

- **Client-Side Solution**: Using `mailto:` protocol with form data serialization
- **Fallback Strategy**: Direct mailto link if JavaScript fails
- **User Feedback**: Visual confirmation and error handling

## Components and Interfaces

### 1. Header Component

```html
<header id="header">
  <div class="logo">
    <span class="icon fa-user-tie"></span>
  </div>
  <div class="content">
    <h1>Matthew Thaokhamlue</h1>
    <p>Technical Product Manager</p>
    <p>5+ years driving AI-powered innovation in B2B SaaS</p>
  </div>
  <nav>
    <ul>
      <li><a href="#about">About</a></li>
      <li><a href="#experience">Experience</a></li>
      <li><a href="#skills">Skills</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
</header>
```

### 2. About Section

- **Professional Summary**: Condensed version of CV summary
- **Location**: Dresden, Germany
- **Key Achievements**: Highlight major accomplishments
- **Education**: Master's and Bachelor's degrees with key details

### 3. Experience Section

- **Current Role**: Labforward GmbH (November 2024 - Present)
- **Previous Roles**: LabTwin GmbH, Thryve GmbH, EY
- **Achievement Format**: Bullet points with quantifiable results
- **Company Context**: Brief description of each company

### 4. Skills Section

- **Technical Skills**:
  - AI/ML: Vibe Prototyping, NLP/LLM implementation
  - Cloud: Azure, AWS certifications
  - Development: Python, API integrations
  - Architecture: Microservices, cloud computing
- **Product Management Skills**:
  - UX Design, User Research
  - Agile methodologies
  - Stakeholder management
  - Product roadmap planning

### 5. Portfolio Component

- **Dedicated Portfolio Page**: Separate portfolio.html with same template structure
- **Work Cards Grid**: Responsive grid layout showcasing key projects
- **Hash-based Routing**: Direct linking to specific projects (portfolio.html#work1)
- **Modal System**: Detailed project views with full descriptions
- **Sample Projects**: LabTwin AI Integration, Thryve Health Data SDK, Vibe Prototyping Methodology

### 6. Contact Component

```javascript
// Email form handler
function handleContactForm(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");

  const subject = `Website Contact from ${name}`;
  const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

  const mailtoLink = `mailto:matthew.thaokhamlue@gmail.com?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoLink;

  // Show confirmation
  showContactConfirmation();
}
```

## Data Models

### Contact Form Data

```javascript
{
  name: String (required, max 100 chars),
  email: String (required, valid email format),
  message: String (required, max 1000 chars)
}
```

### Professional Experience Data

```javascript
{
  company: String,
  position: String,
  duration: String,
  location: String,
  description: String,
  achievements: Array<String>,
  technologies: Array<String>
}
```

### Skills Data

```javascript
{
  technical: {
    ai_ml: Array<String>,
    cloud: Array<String>,
    development: Array<String>,
    architecture: Array<String>
  },
  product_management: Array<String>,
  certifications: Array<{
    name: String,
    issuer: String,
    url: String
  }>
}
```

### Portfolio Work Data

```javascript
{
  id: String,
  title: String,
  type: String,
  description: String,
  challenge: String,
  solution: String,
  achievements: Array<String>,
  technologies: Array<String>,
  impact: String,
  duration: String,
  company: String,
  image: String
}
```

## Error Handling

### Contact Form Errors

1. **Validation Errors**: Client-side validation with inline error messages
2. **Email Client Errors**: Fallback instructions if mailto fails
3. **Browser Compatibility**: Progressive enhancement for older browsers

### Content Loading Errors

1. **Image Loading**: Alt text and placeholder handling
2. **Font Loading**: Fallback fonts specified
3. **CSS/JS Loading**: Graceful degradation

## Testing Strategy

### Manual Testing

1. **Cross-Browser Testing**: Chrome, Firefox, Safari, Edge
2. **Device Testing**: Desktop, tablet, mobile viewports
3. **Contact Form Testing**: Various email clients and scenarios
4. **Accessibility Testing**: Screen reader compatibility, keyboard navigation

### Content Validation

1. **Information Accuracy**: Cross-reference with CV document
2. **Link Validation**: Verify all external links work correctly
3. **Responsive Design**: Test all breakpoints
4. **Performance**: Optimize images and assets

### Email Functionality Testing

1. **Form Submission**: Test with various input combinations
2. **Email Client Integration**: Test with different default email clients
3. **Error Scenarios**: Test with invalid inputs and edge cases
4. **User Experience**: Confirm feedback messages display correctly

## Implementation Notes

### Content Migration Strategy

1. **Systematic Replacement**: Replace lorem ipsum content section by section
2. **Content Hierarchy**: Maintain template's visual hierarchy while updating content
3. **Image Replacement**: Replace placeholder images with professional photos if available
4. **SEO Optimization**: Update meta tags, title, and descriptions

### Email Solution Rationale

- **Client-Side Approach**: Chosen for simplicity and no server requirements
- **GitHub Pages Compatibility**: Works with static hosting
- **User Control**: Users can review email before sending
- **Privacy**: No third-party email services required

### Performance Considerations

- **Image Optimization**: Compress and resize images appropriately
- **CSS/JS Minification**: Use existing minified assets
- **Caching Strategy**: Leverage browser caching for static assets
- **Loading Strategy**: Prioritize above-the-fold content
