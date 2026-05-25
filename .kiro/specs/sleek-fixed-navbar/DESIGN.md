# Design Specification: Sleek Fixed Navbar

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Approved  
**Designer:** Kiro AI

---

## Design Overview

Transform the current floating, scroll-responsive navbar into a globally fixed, minimal navigation bar that embodies modern SaaS design principles: clean, functional, and unobtrusive.

### Design Philosophy

**Principles:**
1. **Clarity over Complexity** - Show only what users need, when they need it
2. **Consistency over Dynamism** - Fixed positioning creates predictable UX
3. **Function over Form** - Every element serves a clear purpose
4. **Accessibility First** - Design for all users, all devices, all abilities

**Inspiration:**
- Linear.app - Minimal fixed navbar with essential actions
- Vercel Dashboard - Clean top bar with role-based context
- Notion - Simple, always-visible navigation
- GitHub - Fixed header with focused functionality

---

## Visual Design System

### A. Layout Architecture

#### Overall Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│  Fixed Container (100vw, z-index: 100)                               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Inner Container (max-w-screen-xl, centered)                   │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  [Logo+Brand]  [KPI Rail]    [Spacer]    [Bell] [Avatar] │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

#### Grid System

```
┌─────────────┬──────────────────────┬──────────┬──────┬────────┐
│   Logo      │      KPI Rail        │  Spacer  │ Bell │ Avatar │
│   (Auto)    │      (Auto)          │  (Flex)  │ 32px │  32px  │
└─────────────┴──────────────────────┴──────────┴──────┴────────┘
     ↑                  ↑                  ↑        ↑       ↑
   32px gap          32px gap           auto    12px gap
```

#### Spacing Tokens

```typescript
const NAVBAR_SPACING = {
  height: '64px',           // Fixed navbar height
  paddingX: {
    desktop: '24px',        // ≥1024px
    tablet: '16px',         // 768px-1023px
    mobile: '12px',         // <768px
  },
  paddingY: '16px',         // Vertical padding
  logoToKpi: '32px',        // Gap between logo and KPI rail
  kpiToActions: 'auto',     // Flex-grow spacer
  bellToAvatar: '12px',     // Gap between bell and avatar
  elementSize: '32px',      // Standard icon/avatar size
};
```

---

### B. Component Specifications

#### 1. Logo + Brand Identity

**Visual Design:**
```
┌──────────────────────────┐
│  [Icon]  ScopeConnect    │
│   32px   Brand Text      │
└──────────────────────────┘
```

**Specifications:**
- **Logo Icon:**
  - Size: 32px × 32px
  - Container: Rounded-full (50% border-radius)
  - Background: White with subtle shadow
  - Image: `/favicon.png` (20px × 20px inside)
  - Shadow: `0 0 10px -2px ${roleTheme.glow}33`

- **Brand Text:**
  - Font size: 16px (text-base)
  - Font weight: 800 (font-extrabold)
  - Letter spacing: -0.025em (tracking-tight)
  - Color: 
    - "Scope" part: `#1a1a1a` (near-black)
    - "Connect" part: Brand color (role-specific)
  - Responsive: Hidden on mobile (<640px)

- **Interactive States:**
  - Hover: `scale(1.01)` transform
  - Active: `scale(0.99)` transform
  - Transition: 150ms ease-out
  - Cursor: pointer

**Code Example:**
```typescript
<Link
  to="/"
  onClick={handleLogoClick}
  className="flex items-center gap-2 rounded-full py-0.5 transition-transform hover:scale-[1.01] active:scale-[0.99]"
>
  <span
    className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm overflow-hidden"
    style={{ boxShadow: `0 0 10px -2px ${roleTheme.glow}33` }}
  >
    <img src="/favicon.png" alt="Logo" className="h-5 w-5 object-contain" />
  </span>
  <span className="hidden sm:inline text-base font-extrabold tracking-tight">
    <span className="text-[#1a1a1a]">{brand.shortName}</span>
    <span className="text-brand">{brand.accentName}</span>
  </span>
</Link>
```

---

#### 2. KPI Rail (Center Slot)

**Visual Design:**
```
┌────────────────────────────────────────────┐
│  [Metric 1]  [Metric 2]  [Metric 3]  ...   │
│   Role-specific content injected here      │
└────────────────────────────────────────────┘
```

**Specifications:**
- **Container:**
  - Display: Flex, items-center, gap-2
  - Max-width: Flexible (content-based)
  - Responsive: Hidden below 1024px (lg:flex)
  - Overflow: Hidden (no scrolling)

- **Content:**
  - Injected via `centerSlot` prop
  - Role-specific components (StudentKpis, CampusLeaderKpis, etc.)
  - Maintains existing styling from KPI components
  - No modifications to KPI component internals

- **Responsive Behavior:**
  - Desktop (≥1024px): Visible
  - Tablet (<1024px): Hidden
  - Mobile (<768px): Hidden

**Code Example:**
```typescript
<div className="hidden lg:flex items-center gap-2">
  {centerSlot}
</div>
```

---

#### 3. Notifications Bell

**Visual Design:**
```
┌──────────┐
│    🔔    │  ← Bell icon (16px)
│   [3]    │  ← Badge (if unread > 0)
└──────────┘
   32px
```

**Specifications:**
- **Button Container:**
  - Size: 32px × 32px
  - Border-radius: 50% (rounded-full)
  - Background: Transparent
  - Hover: `bg-secondary` (light gray)
  - Transition: 150ms ease

- **Bell Icon:**
  - Size: 16px × 16px (h-4 w-4)
  - Color: `text-foreground/60` (60% opacity)
  - Hover: `text-foreground` (100% opacity)
  - Lucide icon: `<Bell />`

- **Notification Badge:**
  - Position: Absolute, top-right corner
  - Size: 14px min-height, auto width
  - Background: `#2563eb` (blue-600)
  - Color: White
  - Font: 8px, bold
  - Border-radius: 9999px (fully rounded)
  - Padding: 0 4px
  - Display: Only when `unread > 0`
  - Max display: 99+ (for counts > 99)

- **Interactive States:**
  - Default: Subtle, unobtrusive
  - Hover: Background appears, icon darkens
  - Active: Dropdown opens below
  - Focus: Visible outline (accessibility)

- **Dropdown:**
  - Position: Absolute, right-aligned
  - Top offset: 40px (10px below button)
  - Animation: Scale-in from top-right
  - Component: `<RoleNotificationCenter />`

**Code Example:**
```typescript
<div ref={bellRef} className="relative hidden md:block">
  <button
    onClick={() => setBellOpen((v) => !v)}
    className="relative flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
    aria-label="Notifications"
    aria-expanded={bellOpen}
  >
    <Bell className="h-4 w-4" />
    {unread > 0 && (
      <span
        className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-blue-600 px-1 text-[8px] font-bold text-white"
        aria-label={`${unread} unread notifications`}
      >
        {unread > 99 ? '99+' : unread}
      </span>
    )}
  </button>
  {bellOpen && (
    <div className="absolute right-0 top-10 origin-top-right animate-scale-in">
      <RoleNotificationCenter
        role={session.role}
        variant="compact"
        onItemClick={() => setBellOpen(false)}
      />
    </div>
  )}
</div>
```

---

#### 4. User Avatar

**Visual Design:**
```
┌──────────┐
│    AB    │  ← Initials or photo
└──────────┘
   32px
```

**Specifications:**
- **Avatar Container:**
  - Size: 32px × 32px
  - Border-radius: 50% (rounded-full)
  - Border: 1.5px solid white
  - Shadow: `0 1px 3px rgba(0,0,0,0.1)`
  - Overflow: hidden

- **Avatar Content:**
  - **With Photo:**
    - Image: Full size (32px × 32px)
    - Object-fit: cover
    - Alt text: Empty (decorative)
  - **Without Photo:**
    - Background: User's avatar color (from profile)
    - Text: First letter of name, uppercase
    - Font: 12px (text-xs), bold
    - Color: Contrasting color (white or dark)

- **Interactive States:**
  - Hover: `scale(1.05)` transform
  - Active: Dropdown opens
  - Focus: Visible outline
  - Transition: 150ms ease

- **Dropdown Menu:**
  - Position: Absolute, right-aligned
  - Top offset: 40px
  - Width: 256px (w-64)
  - Border-radius: 12px (rounded-xl)
  - Background: `bg-popover`
  - Border: 1px solid `border`
  - Shadow: Elegant elevation shadow
  - Animation: Scale-in from top-right

**Dropdown Structure:**
```
┌─────────────────────────┐
│  User Name              │
│  user@email.com         │
├─────────────────────────┤
│  👤 Profile             │
│  ⚙️  Settings           │
├─────────────────────────┤
│  🚪 Sign out            │
└─────────────────────────┘
```

**Code Example:**
```typescript
<div ref={userRef} className="relative">
  <button
    onClick={() => setUserOpen((v) => !v)}
    className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold transition-transform hover:scale-105 shadow-sm"
    style={{
      background: navAvatar.hasImage ? 'transparent' : session.user!.avatarColor,
      border: '1.5px solid white',
    }}
    aria-label="Profile menu"
    aria-expanded={userOpen}
  >
    {navAvatar.hasImage ? (
      <img 
        src={navAvatar.src} 
        alt="" 
        className="h-full w-full object-cover" 
      />
    ) : (
      session.user!.name.charAt(0).toUpperCase()
    )}
  </button>
  {userOpen && (
    <div className="absolute right-0 top-10 w-64 origin-top-right overflow-hidden rounded-xl border border-border bg-popover shadow-elegant animate-scale-in">
      {/* Dropdown content */}
    </div>
  )}
</div>
```

---

#### 5. Unauthenticated State

**Visual Design:**
```
┌─────────────────────────────────────────┐
│  [Logo + Brand]    [Spacer]    [Log in] │
└─────────────────────────────────────────┘
```

**Specifications:**
- **Log in Button:**
  - Variant: Ghost (transparent background)
  - Size: Small (h-9, px-4)
  - Border-radius: 9999px (rounded-full)
  - Font: 14px (text-sm), medium weight
  - Color: `text-foreground`
  - Hover: `bg-secondary/60`
  - Transition: 150ms ease

- **Removed Elements:**
  - ❌ "Join Scope" button (secondary CTA)
  - ❌ All authenticated-only elements

**Code Example:**
```typescript
{!showAuthedUI && (
  <Button 
    asChild 
    variant="ghost" 
    size="sm" 
    className="h-9 rounded-full px-4 text-sm font-medium"
  >
    <Link to="/auth">Log in</Link>
  </Button>
)}
```

---

### C. Color System

#### Background & Surfaces

```typescript
const NAVBAR_COLORS = {
  background: 'rgba(255, 255, 255, 0.8)',  // 80% white
  backdropBlur: 'blur(24px)',               // Heavy blur
  border: 'rgba(255, 255, 255, 0.3)',      // 30% white
  shadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // Subtle shadow
};
```

**Visual Effect:**
- Glass morphism with heavy backdrop blur
- Subtle border for definition
- Minimal shadow for depth
- Allows content to show through slightly

#### Role-Based Theming

```typescript
// Applied via themeForRole() utility
const roleTheme = {
  glow: string,  // Role-specific accent color
  label: string, // Role display name
};

// Used for:
// - Logo shadow tint
// - Subtle accent highlights
// - KPI rail theming (handled by KPI components)
```

**Role Colors:**
- Student: Blue-purple gradient
- Campus Leader: Orange-amber
- Faculty: Green-teal
- Institution Admin: Blue
- Scope Admin: Purple
- Super Admin: Red-pink

#### Interactive States

```typescript
const INTERACTION_COLORS = {
  hover: {
    background: 'bg-secondary',        // Light gray
    opacity: 0.6,                      // 60% for icons
  },
  active: {
    background: 'bg-secondary/60',     // 60% gray
    scale: 0.99,                       // Slight press effect
  },
  focus: {
    outline: '2px solid currentColor', // Visible focus ring
    outlineOffset: '2px',              // Space from element
  },
};
```

#### Notification Badge

```typescript
const BADGE_COLORS = {
  background: '#2563eb',  // Blue-600
  text: '#ffffff',        // White
  shadow: '0 2px 4px rgba(37, 99, 235, 0.2)', // Blue shadow
};
```

---

### D. Typography

#### Font Hierarchy

```typescript
const NAVBAR_TYPOGRAPHY = {
  brandName: {
    size: '16px',           // text-base
    weight: 800,            // font-extrabold
    letterSpacing: '-0.025em', // tracking-tight
    lineHeight: 1,
  },
  buttonText: {
    size: '14px',           // text-sm
    weight: 500,            // font-medium
    letterSpacing: 'normal',
    lineHeight: 1.5,
  },
  badgeCount: {
    size: '8px',            // text-[8px]
    weight: 700,            // font-bold
    letterSpacing: 'normal',
    lineHeight: 1,
  },
};
```

#### Font Stack

```css
font-family: 
  -apple-system, 
  BlinkMacSystemFont, 
  "Segoe UI", 
  Roboto, 
  "Helvetica Neue", 
  Arial, 
  sans-serif;
```

---

### E. Spacing & Sizing

#### Dimensions

```typescript
const NAVBAR_DIMENSIONS = {
  height: '64px',              // Fixed height
  maxWidth: '1280px',          // max-w-screen-xl
  iconSize: '16px',            // h-4 w-4
  avatarSize: '32px',          // h-8 w-8
  buttonSize: '32px',          // h-8 w-8
  dropdownWidth: '256px',      // w-64
};
```

#### Padding & Margins

```typescript
const NAVBAR_SPACING = {
  containerPadding: {
    desktop: '24px',   // px-6
    tablet: '16px',    // px-4
    mobile: '12px',    // px-3
  },
  verticalPadding: '16px',  // py-4
  elementGap: {
    large: '32px',     // gap-8
    medium: '12px',    // gap-3
    small: '8px',      // gap-2
  },
};
```

#### Touch Targets

```typescript
const TOUCH_TARGETS = {
  minimum: '44px',     // WCAG 2.1 Level AAA
  comfortable: '48px', // Preferred for mobile
  desktop: '32px',     // Acceptable for mouse/trackpad
};
```

---

### F. Animation & Transitions

#### Removed Animations

```typescript
// ❌ REMOVE: Scroll-based animations
// - Top position changes (top-6 → top-3)
// - Width transitions (max-w-6xl → max-w-2xl)
// - Collapse/expand animations
// - Shimmer effect on load
```

#### Retained Animations

**1. Hover States**
```css
.navbar-button {
  transition: 
    background-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.navbar-button:hover {
  background-color: var(--secondary);
  transform: scale(1.02);
}
```

**2. Dropdown Animations**
```css
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.dropdown-enter {
  animation: scale-in 200ms ease-out;
  transform-origin: top right;
}
```

**3. Notification Badge Pulse**
```css
@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.notification-badge {
  animation: pulse-subtle 2s ease-in-out infinite;
}
```

#### Animation Principles

1. **Subtle over Flashy** - Animations should enhance, not distract
2. **Fast over Slow** - Keep transitions under 200ms
3. **GPU-Accelerated** - Use transform and opacity only
4. **Purposeful** - Every animation serves a functional purpose

---

### G. Responsive Design

#### Breakpoint Strategy

```typescript
const BREAKPOINTS = {
  mobile: '< 768px',    // sm
  tablet: '768px - 1023px',  // md to lg
  desktop: '≥ 1024px',  // lg+
};
```

#### Layout Adaptations

**Desktop (≥1024px)**
```
┌────────────────────────────────────────────────────────┐
│  [Logo + Brand]  [KPI Rail]  [Spacer]  [Bell] [Avatar] │
└────────────────────────────────────────────────────────┘
```

**Tablet (768px - 1023px)**
```
┌──────────────────────────────────────────────┐
│  [Logo + Brand]  [Spacer]  [Bell] [Avatar]   │
└──────────────────────────────────────────────┘
```

**Mobile (<768px)**
```
┌────────────────────────────────────┐
│  [Logo]  [Spacer]  [Avatar]        │
└────────────────────────────────────┘
```

#### Responsive Classes

```typescript
// Logo + Brand
<span className="hidden sm:inline">Brand Name</span>

// KPI Rail
<div className="hidden lg:flex">KPI Rail</div>

// Notifications Bell
<div className="hidden md:block">Bell</div>

// Padding
<div className="px-3 md:px-4 lg:px-6">Container</div>
```

---

### H. Accessibility Design

#### Visual Accessibility

**Color Contrast:**
- Text on background: ≥ 4.5:1 (WCAG AA)
- Interactive elements: ≥ 3:1 (WCAG AA)
- Notification badge: ≥ 7:1 (WCAG AAA)

**Focus Indicators:**
```css
.navbar-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  border-radius: 9999px;
}
```

**Visual Feedback:**
- Hover states clearly visible
- Active states provide press feedback
- Loading states show progress
- Error states use color + icon

#### Keyboard Navigation

**Tab Order:**
1. Logo
2. Notifications Bell (if visible)
3. User Avatar
4. Dropdown items (when open)

**Keyboard Shortcuts:**
- `Tab` - Move focus forward
- `Shift + Tab` - Move focus backward
- `Enter` / `Space` - Activate focused element
- `Escape` - Close open dropdowns

#### Screen Reader Support

**ARIA Labels:**
```typescript
<button aria-label="Notifications" aria-expanded={bellOpen}>
  <Bell aria-hidden="true" />
  <span aria-label={`${unread} unread notifications`}>
    {unread}
  </span>
</button>
```

**Semantic HTML:**
- `<header>` for navbar container
- `<nav>` for navigation sections
- `<button>` for interactive elements
- `<Link>` for navigation links

---

## Implementation Guidelines

### CSS Architecture

**Utility-First Approach:**
- Use Tailwind CSS utilities for 95% of styling
- Custom CSS only for complex animations
- No inline styles except for dynamic values (role colors)

**Class Organization:**
```typescript
// Layout classes first
className="flex items-center gap-2"

// Sizing classes
className="h-8 w-8"

// Visual classes
className="rounded-full bg-white shadow-sm"

// Interactive classes
className="transition-transform hover:scale-105"

// Responsive classes last
className="hidden md:block lg:flex"
```

### Component Structure

**Composition Pattern:**
```typescript
<NavbarShell centerSlot={<RoleKpis />} roleLabel="Student">
  {/* Shell handles chrome, slot handles role content */}
</NavbarShell>
```

**Separation of Concerns:**
- NavbarShell: Visual chrome, layout, interactions
- RoleNavbar: Role dispatching logic
- RoleKpis: Role-specific content
- AppShell: Page layout integration

### Performance Considerations

**Optimization Strategies:**
1. Remove scroll event listeners
2. Memoize expensive computations
3. Use CSS transforms for animations
4. Lazy load dropdown content
5. Debounce notification polling

**Bundle Size:**
- Target: < 5KB gzipped increase
- Remove unused code
- Tree-shake icon imports
- Optimize images

---

## Design Tokens

### Spacing Scale

```typescript
export const spacing = {
  xs: '4px',    // 0.5
  sm: '8px',    // 1
  md: '12px',   // 1.5
  lg: '16px',   // 2
  xl: '24px',   // 3
  '2xl': '32px', // 4
  '3xl': '48px', // 6
  '4xl': '64px', // 8
};
```

### Size Scale

```typescript
export const sizes = {
  icon: {
    sm: '12px',  // h-3 w-3
    md: '16px',  // h-4 w-4
    lg: '20px',  // h-5 w-5
    xl: '24px',  // h-6 w-6
  },
  avatar: {
    sm: '24px',  // h-6 w-6
    md: '32px',  // h-8 w-8
    lg: '40px',  // h-10 w-10
  },
  button: {
    sm: '32px',  // h-8
    md: '36px',  // h-9
    lg: '40px',  // h-10
  },
};
```

### Shadow Scale

```typescript
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 1px 3px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 6px rgba(0, 0, 0, 0.1)',
  xl: '0 10px 15px rgba(0, 0, 0, 0.1)',
  elegant: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};
```

---

## Design Checklist

### Visual Design
- [ ] Fixed positioning at top-0
- [ ] Consistent 64px height
- [ ] Clean, minimal layout
- [ ] Role-based theming applied
- [ ] Proper spacing and alignment
- [ ] Subtle, purposeful animations

### Component Design
- [ ] Logo + Brand identity clear
- [ ] KPI rail integrates seamlessly
- [ ] Notifications bell functional
- [ ] User avatar with dropdown
- [ ] Unauthenticated state clean

### Responsive Design
- [ ] Desktop layout works (≥1024px)
- [ ] Tablet layout works (768-1023px)
- [ ] Mobile layout works (<768px)
- [ ] Touch targets ≥44px on mobile
- [ ] No horizontal scrolling

### Accessibility Design
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader support complete
- [ ] ARIA labels present

### Performance Design
- [ ] No scroll-based animations
- [ ] GPU-accelerated transitions
- [ ] Minimal re-renders
- [ ] Optimized bundle size

---

## Design Approval

**Design Lead:** _________________  
**Product Owner:** _________________  
**Engineering Lead:** _________________  
**Date:** _________________

---

## Appendix: Visual Mockups

### Desktop View (1440px)
```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │  [🔷 Logo] ScopeConnect    [📊 KPI Rail]         [🔔 3] [👤 AB]  │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Tablet View (768px)
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │  [🔷] ScopeConnect         [🔔 3] [👤 AB]      │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Mobile View (375px)
```
┌──────────────────────────────────┐
│                                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │  [🔷] Scope    [👤 AB]    │  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

---

**End of Design Specification**
