# Requirements: Sleek Fixed Navbar

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Approved

---

## Executive Summary

Transform the current floating, scroll-responsive navbar into a globally fixed, minimal navigation bar that provides consistent positioning and reduced visual clutter while maintaining all essential functionality and role-based features.

---

## Business Requirements

### BR-1: Improved User Experience
**Priority:** High  
**Stakeholder:** Product Team, End Users

**Requirement:**  
Users need a consistent, predictable navigation experience that doesn't change position or appearance as they scroll through content.

**Rationale:**
- Current floating navbar creates visual distraction with scroll-based animations
- Position changes can cause confusion about navigation location
- Excessive icons create cognitive overload
- Modern web applications favor fixed, minimal navigation

**Success Criteria:**
- Navigation remains in consistent position across all pages
- User testing shows improved navigation clarity
- Reduced time to locate navigation elements

---

### BR-2: Visual Consistency
**Priority:** High  
**Stakeholder:** Design Team, Brand Team

**Requirement:**  
The navbar should reflect modern design principles with a clean, professional appearance that aligns with the platform's brand identity.

**Rationale:**
- Current design has too many competing visual elements
- Floating capsule design feels dated compared to modern SaaS applications
- Simplified design improves brand perception and professionalism

**Success Criteria:**
- Design team approval of final implementation
- Positive feedback from stakeholders on visual appearance
- Alignment with design system guidelines

---

### BR-3: Performance Optimization
**Priority:** Medium  
**Stakeholder:** Engineering Team, End Users

**Requirement:**  
Remove unnecessary scroll event listeners and animations to improve page performance and reduce JavaScript execution overhead.

**Rationale:**
- Scroll listeners can cause performance issues on lower-end devices
- Unnecessary animations consume CPU/GPU resources
- Simpler implementation is easier to maintain

**Success Criteria:**
- No scroll-based JavaScript execution for navbar
- Lighthouse performance score maintained or improved
- Smooth 60fps scrolling on target devices

---

## Functional Requirements

### FR-1: Fixed Global Positioning
**Priority:** P0 (Critical)  
**Category:** Layout & Positioning

**Description:**  
The navbar must remain fixed at the top of the viewport at all times, regardless of scroll position or page content.

**User Story:**  
As a user, I want the navigation bar to always be visible at the top of my screen so that I can quickly access navigation options without scrolling back to the top.

**Detailed Requirements:**
1. Navbar position must be `fixed` with `top: 0`
2. Navbar must span full viewport width
3. Navbar must remain above all other content (z-index: 100)
4. No vertical position changes based on scroll events
5. Content below navbar must have appropriate spacing to prevent overlap

**Acceptance Criteria:**
- [ ] Navbar CSS position is `fixed`
- [ ] Navbar top property is `0` (not `top-3` or `top-6`)
- [ ] Navbar visible on all pages using AppShell component
- [ ] Main content has `padding-top: 64px` or equivalent spacing
- [ ] Navbar remains visible when scrolling to bottom of long pages
- [ ] No JavaScript scroll listeners that modify navbar position

**Dependencies:**
- AppShell component must be updated to add top padding
- Any page-specific layouts must account for fixed navbar height

**Edge Cases:**
- Very short pages (< viewport height): Navbar still fixed
- Modal overlays: Should appear above navbar (z-index > 100)
- Print view: Consider hiding navbar or making it static

---

### FR-2: Simplified Navigation Elements
**Priority:** P0 (Critical)  
**Category:** UI Components

**Description:**  
Remove redundant and cluttered navigation elements to create a clean, focused interface.

**User Story:**  
As a user, I want a clean navigation bar with only essential elements so that I can focus on my tasks without visual distraction.

**Elements to Remove:**
1. **Primary Navigation Icon Rail** (6 icons)
   - Currently shows up to 6 role-specific navigation icons
   - Redundant with sidebar navigation and mobile dock
   - Creates visual clutter in limited navbar space

2. **Role Badge Component**
   - Pulsing indicator with role label
   - Redundant with KPI rail which already indicates role context
   - Takes up valuable horizontal space

3. **Mobile Hamburger Menu**
   - Three-line menu icon for mobile navigation
   - Functionality should be handled by dedicated mobile dock
   - Not needed in fixed navbar design

4. **"Join Scope" CTA Button** (unauthenticated state)
   - Secondary call-to-action button
   - Keep only "Log in" button for cleaner appearance
   - CTA can be placed elsewhere on landing pages

**Elements to Retain:**
1. **Logo + Brand Name**
   - Primary brand identity
   - Clickable to navigate to role-appropriate home

2. **KPI Rail** (center slot)
   - Role-specific metrics and indicators
   - Core feature of role-based navigation system
   - Hidden on mobile/tablet breakpoints

3. **Notifications Bell**
   - Essential for real-time platform updates
   - Badge shows unread count
   - Dropdown for notification center

4. **User Avatar**
   - Profile access and account management
   - Dropdown menu for settings, profile, logout
   - Visual indicator of authentication state

**Acceptance Criteria:**
- [ ] Primary nav icon rail code removed from NavbarShell
- [ ] Role badge component removed from render tree
- [ ] Mobile hamburger menu button removed
- [ ] "Join Scope" button removed from unauthenticated state
- [ ] Logo, KPI rail, Bell, and Avatar remain functional
- [ ] All removed elements' functionality accessible via alternative routes
- [ ] No broken links or navigation dead-ends

**Dependencies:**
- Mobile dock must provide primary navigation access
- Sidebar navigation must be accessible on desktop
- Role badge information available elsewhere if needed

---

### FR-3: Consistent Visual Dimensions
**Priority:** P1 (High)  
**Category:** Visual Design

**Description:**  
Navbar must maintain fixed dimensions without any scroll-based or responsive size changes.

**User Story:**  
As a user, I want the navigation bar to maintain a consistent size so that the interface feels stable and predictable.

**Detailed Requirements:**

**Height:**
- Fixed height: `64px` (16 Tailwind units)
- No collapse to smaller height on scroll
- Consistent across all breakpoints
- Sufficient for touch targets on mobile (44px minimum)

**Width:**
- Full viewport width (100vw)
- Inner content container: `max-width: 1280px` (max-w-screen-xl)
- Centered with `margin: 0 auto`
- Horizontal padding: 24px desktop, 16px tablet, 12px mobile

**Spacing:**
- Logo to KPI rail: 32px gap
- KPI rail to action buttons: auto (flex-grow spacer)
- Bell to Avatar: 12px gap
- Vertical padding: 16px (centers 32px elements in 64px height)

**No Transitions:**
- Remove all width transition animations
- Remove all height transition animations
- Remove all top position transitions
- Keep only hover/focus state transitions (< 200ms)

**Acceptance Criteria:**
- [ ] Navbar height is always 64px
- [ ] No CSS transitions on width, height, or top properties
- [ ] Max-width is 1280px with centered alignment
- [ ] Horizontal padding adjusts per breakpoint
- [ ] No scroll event listeners that modify dimensions
- [ ] Visual regression tests pass for all screen sizes

**Dependencies:**
- Tailwind CSS configuration for breakpoints
- Design system spacing tokens

---

### FR-4: Streamlined Authentication UI
**Priority:** P1 (High)  
**Category:** Authentication & Access

**Description:**  
Simplify the unauthenticated navbar state to show only essential elements.

**User Story:**  
As an unauthenticated visitor, I want a clean navigation bar that doesn't overwhelm me with options so that I can focus on exploring the platform or signing in.

**Unauthenticated State:**
- Show: Logo + Brand Name
- Show: "Log in" button (ghost variant, rounded-full)
- Hide: "Join Scope" button
- Hide: All authenticated-only elements (Bell, Avatar, KPI rail)

**Authenticated State:**
- Show: Logo + Brand Name
- Show: KPI Rail (role-specific)
- Show: Notifications Bell with badge
- Show: User Avatar with dropdown
- Hide: "Log in" button

**Button Styling:**
```typescript
// Log in button (unauthenticated)
<Button 
  variant="ghost" 
  size="sm" 
  className="h-9 rounded-full px-4 text-sm font-medium"
>
  Log in
</Button>
```

**Acceptance Criteria:**
- [ ] Unauthenticated state shows only Logo + "Log in"
- [ ] "Join Scope" button removed from codebase
- [ ] "Log in" button navigates to `/auth` route
- [ ] Authenticated state shows full navbar with role features
- [ ] Smooth transition between auth states (no layout shift)
- [ ] Session hydration doesn't cause visual flicker

**Dependencies:**
- `useUserSession` hook for auth state
- Auth routing configuration

---

### FR-5: Preserved Role-Based Features
**Priority:** P0 (Critical)  
**Category:** Role-Based Access Control

**Description:**  
Maintain all existing role-based functionality including KPI rails, theme colors, and role-specific navigation while simplifying the visual presentation.

**User Story:**  
As a user with a specific role, I want to see my role-appropriate metrics and features in the navbar so that I have quick access to relevant information.

**Role-Based Elements:**

**1. KPI Rails (centerSlot prop)**
- StudentKpis: Gamification metrics, progress indicators
- CampusLeaderKpis: Campus-specific metrics
- FacultyKpis: Faculty coordination metrics
- InstitutionKpis: Institutional admin metrics
- ScopeAdminKpis: Platform admin metrics
- SuperAdminKpis: System-wide metrics
- GenericAdminKpis: Generic admin metrics

**2. Theme Colors**
- Role-specific glow colors via `themeForRole()`
- Applied to logo shadow and subtle accents
- Maintains visual role identity

**3. Navigation Configuration**
- Role-specific landing pages via `landingRouteForRole()`
- Logo click navigates to appropriate dashboard
- Profile menu shows role-appropriate options

**4. Notification System**
- Real-time notification polling continues
- Role-filtered notifications via `RoleNotificationCenter`
- Unread badge count updates

**Acceptance Criteria:**
- [ ] All role-specific KPI components render correctly
- [ ] `centerSlot` prop continues to work as expected
- [ ] Role theme colors applied via CSS variables
- [ ] Logo navigation goes to correct role landing page
- [ ] Notification polling continues without interruption
- [ ] `RoleNotificationCenter` displays role-filtered notifications
- [ ] Profile dropdown shows role-appropriate menu items
- [ ] No role leakage (wrong KPI rail for role)

**Dependencies:**
- `RoleNavbar.tsx` dispatcher component
- `themeForRole()` utility function
- `landingRouteForRole()` utility function
- `navConfigForRole()` configuration
- Role-specific KPI components in `RoleKpiBar.tsx`

**Security Considerations:**
- Role verification must happen server-side
- Client-side role display is for UX only
- No sensitive data exposed in navbar for wrong roles

---

### FR-6: Responsive Adaptation
**Priority:** P1 (High)  
**Category:** Responsive Design

**Description:**  
Navbar must adapt gracefully to different screen sizes while maintaining functionality and usability.

**User Story:**  
As a user on any device, I want the navigation bar to work well on my screen size so that I can navigate effectively regardless of my device.

**Breakpoint Behavior:**

**Desktop (≥ 1024px)**
- Full layout with all elements
- KPI rail visible and fully functional
- Logo + Brand name visible
- Bell + Avatar with full dropdowns
- Horizontal padding: 24px

**Tablet (768px - 1023px)**
- KPI rail hidden (insufficient space)
- Logo + Brand name visible
- Bell + Avatar visible
- Horizontal padding: 16px
- Touch targets ≥ 44px

**Mobile (< 768px)**
- Minimal layout
- Logo visible, brand name may truncate
- Avatar visible
- Bell hidden (accessible via mobile dock)
- Horizontal padding: 12px
- Touch targets ≥ 44px

**Responsive Classes:**
```typescript
// KPI Rail
<div className="hidden lg:flex">
  {centerSlot}
</div>

// Brand Name
<span className="hidden sm:inline">
  {brand.shortName}
</span>

// Notifications Bell
<div className="hidden md:block">
  <Bell />
</div>
```

**Acceptance Criteria:**
- [ ] KPI rail hidden below 1024px width
- [ ] Brand name truncates gracefully on small screens
- [ ] Bell icon hidden below 768px width
- [ ] All interactive elements have ≥44px touch targets on mobile
- [ ] Horizontal padding adjusts per breakpoint
- [ ] No horizontal scrolling at any breakpoint
- [ ] Dropdowns position correctly on all screen sizes
- [ ] Visual regression tests pass for all breakpoints

**Dependencies:**
- Tailwind CSS responsive utilities
- Mobile dock component for mobile navigation

---

### FR-7: Accessibility Compliance
**Priority:** P1 (High)  
**Category:** Accessibility (a11y)

**Description:**  
Navbar must be fully accessible to users with disabilities, meeting WCAG 2.1 Level AA standards.

**User Story:**  
As a user with disabilities, I want to navigate the platform using keyboard and assistive technologies so that I have equal access to all features.

**Keyboard Navigation:**
1. Tab key moves focus through interactive elements in logical order:
   - Logo → Bell → Avatar → Dropdown items (when open)
2. Escape key closes open dropdowns
3. Enter/Space activates focused buttons and links
4. Arrow keys navigate within dropdowns (optional enhancement)

**Screen Reader Support:**
1. All interactive elements have descriptive `aria-label` attributes
2. Dropdown state communicated via `aria-expanded`
3. Notification badge count announced via `aria-live="polite"`
4. Role badge (if retained) has appropriate semantic markup

**Visual Accessibility:**
1. Focus indicators visible on all focusable elements
2. Color contrast ratio ≥ 4.5:1 for text (WCAG AA)
3. Interactive elements distinguishable without color alone
4. No information conveyed by color only

**Required ARIA Attributes:**
```typescript
// Logo
<Link to="/" aria-label="Navigate to home">

// Notifications Bell
<button aria-label="Notifications" aria-expanded={bellOpen}>
  <Bell aria-hidden="true" />
  {unread > 0 && (
    <span aria-label={`${unread} unread notifications`}>
      {unread}
    </span>
  )}
</button>

// User Avatar
<button aria-label="Profile menu" aria-expanded={userOpen}>

// Dropdown menus
<div role="menu" aria-label="Profile options">
  <Link role="menuitem">Profile</Link>
  <Link role="menuitem">Settings</Link>
  <button role="menuitem">Sign out</button>
</div>
```

**Focus Management:**
1. Focus trapped within open dropdowns
2. Focus returns to trigger button when dropdown closes
3. Focus visible with clear outline (not removed)
4. Skip link to main content (optional enhancement)

**Acceptance Criteria:**
- [ ] All interactive elements have `aria-label` or visible text
- [ ] Dropdowns have `aria-expanded` attribute
- [ ] Notification badge has `aria-live` region
- [ ] Tab navigation works in logical order
- [ ] Escape key closes dropdowns
- [ ] Focus indicators visible on all elements
- [ ] Color contrast passes WCAG AA (4.5:1 minimum)
- [ ] Lighthouse accessibility score ≥ 95/100
- [ ] Screen reader testing passes (NVDA/JAWS/VoiceOver)
- [ ] Keyboard-only navigation testing passes

**Dependencies:**
- ARIA attribute utilities
- Focus management hooks
- Keyboard event handlers

**Testing Tools:**
- axe DevTools
- Lighthouse
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- Keyboard-only testing

---

### FR-8: Performance Optimization
**Priority:** P2 (Medium)  
**Category:** Performance

**Description:**  
Optimize navbar implementation to minimize performance impact and ensure smooth user experience.

**User Story:**  
As a user, I want the navigation bar to load quickly and not slow down page scrolling so that I have a smooth browsing experience.

**Performance Targets:**

**Load Performance:**
- First paint: < 100ms
- Time to interactive: < 200ms
- Navbar render time: < 50ms
- No blocking JavaScript

**Runtime Performance:**
- Scroll performance: 60fps maintained
- Dropdown open: < 200ms animation
- No layout thrashing
- No forced reflows

**Optimization Strategies:**

**1. Remove Scroll Listeners**
```typescript
// REMOVE: Expensive scroll event listener
useEffect(() => {
  const onScroll = () => {
    // Causes reflow on every scroll event
    setCollapsed(window.scrollY > 32);
  };
  window.addEventListener("scroll", onScroll);
  return () => window.removeEventListener("scroll", onScroll);
}, []);
```

**2. Minimize Re-renders**
```typescript
// Use React.memo for expensive child components
const KpiRail = React.memo(({ children }) => children);

// Memoize expensive computations
const roleTheme = useMemo(() => themeForRole(session.role), [session.role]);
```

**3. GPU-Accelerated Animations**
```css
/* Use transform and opacity only */
.dropdown-enter {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 200ms, transform 200ms;
}

.dropdown-enter-active {
  opacity: 1;
  transform: scale(1);
}
```

**4. Code Splitting**
```typescript
// Lazy load notification center
const RoleNotificationCenter = lazy(() => 
  import("@/components/site/RoleNotificationCenter")
);
```

**5. Debounce/Throttle**
```typescript
// Throttle notification polling
const syncNotifications = useCallback(
  throttle(async () => {
    await notifications.syncFromBackend();
  }, 15000),
  []
);
```

**Acceptance Criteria:**
- [ ] No scroll event listeners attached to window
- [ ] Lighthouse performance score ≥ 90/100
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] No layout shifts (CLS < 0.1)
- [ ] Smooth 60fps scrolling on target devices
- [ ] Dropdown animations use transform/opacity only
- [ ] No unnecessary re-renders (React DevTools profiling)
- [ ] Bundle size impact < 5KB gzipped

**Performance Testing:**
- Lighthouse CI in build pipeline
- WebPageTest for real-world metrics
- Chrome DevTools Performance profiling
- React DevTools Profiler
- Bundle size analysis (webpack-bundle-analyzer)

**Dependencies:**
- Performance monitoring tools
- Build optimization configuration

---

## Non-Functional Requirements

### NFR-1: Browser Compatibility
**Priority:** High

**Supported Browsers:**
- Chrome 90+ (released April 2021)
- Firefox 88+ (released April 2021)
- Safari 14+ (released September 2020)
- Edge 90+ (released April 2021)

**Graceful Degradation:**
- Backdrop blur fallback for older browsers
- CSS Grid fallback to Flexbox
- No critical functionality requires cutting-edge features

**Testing Matrix:**
- Windows 10/11: Chrome, Firefox, Edge
- macOS: Chrome, Firefox, Safari
- iOS: Safari, Chrome
- Android: Chrome, Firefox

**Acceptance Criteria:**
- [ ] Visual testing passes on all supported browsers
- [ ] Functional testing passes on all supported browsers
- [ ] Fallbacks work correctly on older browsers
- [ ] No console errors on any supported browser

---

### NFR-2: Code Quality
**Priority:** High

**Standards:**
- TypeScript strict mode enabled
- ESLint rules enforced (no warnings)
- Prettier formatting applied
- All props fully typed (no `any` types)
- JSDoc comments on exported functions

**Code Organization:**
- Reusable utilities extracted to separate files
- Magic numbers replaced with named constants
- Complex logic extracted to custom hooks
- Component file size < 500 lines

**Testing Coverage:**
- Unit tests for all utility functions
- Component tests for user interactions
- Integration tests for auth flows
- Visual regression tests for UI

**Acceptance Criteria:**
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes with no warnings
- [ ] Prettier formatting applied
- [ ] Test coverage ≥ 80% for modified files
- [ ] No `any` types in component props
- [ ] All exported functions have JSDoc comments

---

### NFR-3: Maintainability
**Priority:** Medium

**Documentation:**
- Inline comments for complex logic
- README updated with navbar architecture
- Storybook stories for navbar variants
- Migration guide for breaking changes

**Code Reusability:**
- Shared utilities in `/lib` directory
- Reusable hooks in `/hooks` directory
- Design tokens in Tailwind config
- Component composition over duplication

**Acceptance Criteria:**
- [ ] Code is self-documenting with clear naming
- [ ] Complex logic has explanatory comments
- [ ] Storybook stories created for navbar states
- [ ] README includes navbar documentation

---

### NFR-4: Security
**Priority:** High

**Authentication:**
- Session validation on every request
- No sensitive data in client-side state
- Secure logout clears all local data
- CSRF protection on auth endpoints

**XSS Prevention:**
- All user-generated content sanitized
- No `dangerouslySetInnerHTML` usage
- Content Security Policy headers
- Input validation on all forms

**Role-Based Access:**
- Server-side role verification
- Client-side role display for UX only
- No role escalation possible from client
- Audit logging for role changes

**Acceptance Criteria:**
- [ ] Security audit passes
- [ ] No XSS vulnerabilities
- [ ] CSRF tokens implemented
- [ ] Role verification server-side only

---

## User Stories

### US-1: Consistent Navigation Access
**As a** platform user  
**I want** the navigation bar to always be visible at the top of my screen  
**So that** I can quickly access navigation options without scrolling

**Acceptance Criteria:**
- Navbar is visible on all pages
- Navbar doesn't move when scrolling
- Navbar is accessible via keyboard

---

### US-2: Clean Visual Experience
**As a** platform user  
**I want** a clean, uncluttered navigation bar  
**So that** I can focus on my work without visual distraction

**Acceptance Criteria:**
- Only essential elements are visible
- No unnecessary icons or badges
- Clear visual hierarchy

---

### US-3: Quick Notification Access
**As an** authenticated user  
**I want** to see my notification count in the navbar  
**So that** I can stay updated on platform activity

**Acceptance Criteria:**
- Bell icon shows unread count
- Clicking bell opens notification center
- Real-time updates work correctly

---

### US-4: Easy Profile Access
**As an** authenticated user  
**I want** to access my profile and settings from the navbar  
**So that** I can manage my account quickly

**Acceptance Criteria:**
- Avatar is visible and clickable
- Dropdown shows profile, settings, logout
- Navigation works correctly

---

### US-5: Role-Appropriate Metrics
**As a** user with a specific role  
**I want** to see my role-specific metrics in the navbar  
**So that** I have quick access to relevant information

**Acceptance Criteria:**
- KPI rail shows role-specific metrics
- Metrics update in real-time
- No metrics from other roles are visible

---

### US-6: Mobile-Friendly Navigation
**As a** mobile user  
**I want** the navbar to work well on my phone  
**So that** I can navigate effectively on small screens

**Acceptance Criteria:**
- Navbar adapts to mobile screen size
- Touch targets are large enough (≥44px)
- No horizontal scrolling

---

### US-7: Accessible Navigation
**As a** user with disabilities  
**I want** to navigate using keyboard and screen readers  
**So that** I have equal access to all features

**Acceptance Criteria:**
- Keyboard navigation works
- Screen readers announce elements correctly
- Focus indicators are visible

---

## Constraints

### Technical Constraints
1. Must use existing React + TypeScript stack
2. Must maintain compatibility with TanStack Router
3. Must work with existing Tailwind CSS configuration
4. Must not break existing role-based access control system
5. Must maintain SSR compatibility

### Design Constraints
1. Must align with existing design system
2. Must maintain brand identity (logo, colors)
3. Must support role-specific theming
4. Must work with existing component library (shadcn/ui)

### Business Constraints
1. No breaking changes to public APIs
2. Must be deployable without database migrations
3. Must not require user re-authentication
4. Must maintain feature parity with current navbar

### Time Constraints
1. Implementation: 2-3 days
2. Testing: 1-2 days
3. Review and deployment: 1 day
4. Total: ~1 week

---

## Dependencies

### Internal Dependencies
- `useUserSession` hook for authentication state
- `themeForRole` utility for role-based styling
- `landingRouteForRole` utility for navigation
- `navConfigForRole` utility for role configuration
- `RoleNotificationCenter` component
- `MobileDock` component for mobile navigation
- Tailwind CSS configuration
- shadcn/ui component library

### External Dependencies
- React 18+
- TypeScript 5+
- TanStack Router
- Tailwind CSS 3+
- Lucide React (icons)
- Sonner (toast notifications)

---

## Risks & Mitigations

### Risk 1: User Confusion from Removed Elements
**Probability:** Medium  
**Impact:** Medium

**Mitigation:**
- Ensure all removed functionality is accessible via alternative routes
- Add tooltips or help text if needed
- Monitor user feedback and support tickets
- Provide in-app announcement of changes

### Risk 2: Mobile Navigation Gaps
**Probability:** Low  
**Impact:** High

**Mitigation:**
- Verify mobile dock provides all necessary navigation
- Test thoroughly on actual mobile devices
- Provide fallback navigation options
- Monitor mobile analytics for navigation issues

### Risk 3: Performance Regression
**Probability:** Low  
**Impact:** Medium

**Mitigation:**
- Profile performance before and after changes
- Run Lighthouse CI in build pipeline
- Monitor real-user metrics (RUM)
- Have rollback plan ready

### Risk 4: Accessibility Issues
**Probability:** Low  
**Impact:** High

**Mitigation:**
- Test with screen readers during development
- Run automated accessibility tests
- Get feedback from accessibility experts
- Fix issues before production deployment

---

## Success Criteria

### Must Have (P0)
- [ ] Navbar is fixed at top-0 with no scroll changes
- [ ] Primary nav icons removed
- [ ] Role badge removed
- [ ] Mobile hamburger removed
- [ ] All role-based features work correctly
- [ ] Accessibility standards met (WCAG AA)
- [ ] No performance regression

### Should Have (P1)
- [ ] "Join Scope" button removed
- [ ] Consistent 64px height maintained
- [ ] Responsive behavior works correctly
- [ ] Visual design matches specification
- [ ] Code quality standards met

### Nice to Have (P2)
- [ ] Performance improvements measurable
- [ ] User feedback is positive
- [ ] Support tickets don't increase
- [ ] Analytics show improved engagement

---

## Approval

**Product Owner:** _________________  
**Engineering Lead:** _________________  
**Design Lead:** _________________  
**Date:** _________________

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-XX | Kiro | Initial requirements document |
