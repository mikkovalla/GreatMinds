# Vue Components

This directory contains the Vue.js components for the MindChat authentication app.

## Components

### Button.vue

A reusable button component with multiple variants, sizes, and states.

**Props:**

- `variant`: 'primary' | 'secondary' | 'ghost' (default: 'primary')
- `size`: 'small' | 'medium' | 'large' (default: 'medium')
- `disabled`: boolean (default: false)
- `loading`: boolean (default: false)
- `href`: string (optional) - Makes the button render as a link
- `external`: boolean (default: false) - For external links
- `buttonType`: 'button' | 'submit' | 'reset' (default: 'button')

**Events:**

- `click`: Emitted when button is clicked

**Usage:**

```vue
<Button variant="primary" size="medium" @click="handleClick">
  Click me
</Button>

<Button href="/login" variant="secondary">
  Go to Login
</Button>
```

### Navbar.vue

The main navigation component with responsive design and language selector, now **refactored to match the exact structure from the client site**.

**Props:**

- `isAuthenticated`: boolean (default: false) - Controls auth button visibility (for future auth integration)

**Events:**

- `login`: Emitted when login is needed (for future auth integration)
- `register`: Emitted when register is needed (for future auth integration)
- `logout`: Emitted when logout is needed (for future auth integration)

**Features:**

- **Exact client site structure**: Uses `.nav`, `.container`, `.nav-container`, `.nav-logo` classes
- **Golden animated logo**: Matches client site with `text-gold` and `text-gold-animated` classes
- **Dual language pickers**: Desktop and mobile versions like the client site
- **Client site URLs**: Navigation links point to `/en/categories/writer`, `/en/categories/thinker`, `/en/categories/scientist`
- **CDN flag icons**: Uses `https://cdn.jsdelivr.net/gh/lipis/flag-icons@latest/flags/4x3/` like client site
- **Responsive hamburger menu**: Full-screen overlay on mobile
- **Sticky positioning**: Stays at top of viewport

**Structure matches client site:**

```html
<header class="nav">
  <div class="container">
    <nav class="nav-container">
      <div class="nav-logo text-gold text-gold-animated">
        <a href="/en/">MindChat</a>
      </div>
      <ul class="nav-links">
        <!-- Navigation items -->
        <div class="nav-language-picker"> <!-- Mobile language picker --> </div>
      </ul>
      <div class="desktop-language-picker"> <!-- Desktop language picker --> </div>
      <button class="hamburger"> <!-- Mobile menu button --> </button>
    </nav>
  </div>
</header>
```

**Usage:**

```vue
<Navbar 
  :is-authenticated="userIsLoggedIn"
  @login="handleLogin"
  @register="handleRegister"
  @logout="handleLogout"
/>
```

### Layout.vue

A layout wrapper component that includes the Navbar and provides the main content area.

**Features:**

- Includes Navbar component
- Manages authentication state
- Provides main content slot
- Full viewport height layout

**Usage:**

```vue
<Layout>
  <div>Your page content here</div>
</Layout>
```

## Styling

All components use CSS custom properties defined in `src/styles/global.css`:

- `--background-color`: Dark background (#121212)
- `--text-color`: Light text (#f0f0f0)
- `--gold-bright`: Primary gold color (#e0b64c)
- `--gold-medium`: Medium gold (#c8a440)
- `--gold-dark`: Dark gold (#a08230)
- `--component-bg`: Component background (#222227)
- `--border-color`: Border color with transparency
- `--primary-font`: Main font family (Lato, Noto Sans)

## Responsive Design

- Mobile-first approach
- Breakpoints:
  - Mobile: up to 767px
  - Tablet: 768px to 1023px
  - Desktop: 1024px and up

## Next Steps

The navbar is ready for integration with:

1. Authentication logic (login/register forms)
2. Routing system for navigation
3. User state management
4. Language switching functionality
