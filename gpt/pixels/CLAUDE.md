# Pixels Project Guidelines

## Project Structure
- Simple web project with HTML, CSS, and JavaScript (ES modules)
- Canvas-based application for pixel rendering

## Development Commands
- No build system detected - vanilla HTML/JS/CSS
- To run locally: Open `index.html` in a browser or use a local server
  - Example: `python -m http.server` or `npx serve`

## Code Style Guidelines
- **JavaScript**:
  - Use ES Modules (`type="module"`)
  - 2-space indentation
  - Use `const` for variables that don't change
  - Camel case for variable/function names (`myVariable`)
- **HTML/CSS**:
  - 4-space indentation for HTML, 2-space for CSS
  - Use semantic HTML elements
  - Mobile-friendly with appropriate meta tags
  - CSS classes should use kebab-case (`my-class`)
- **Error Handling**:
  - Add try/catch blocks for critical operations
  - Provide user feedback for errors when appropriate

## Canvas Best Practices
- Set canvas dimensions in JavaScript to match display
- Use `requestAnimationFrame` for animations
- Optimize rendering for performance
- Handle device pixel ratio for retina displays