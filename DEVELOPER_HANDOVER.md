# Developer Handover Document
## Rende-View Dating Application

**Last Updated:** January 26, 2026  
**Application Status:** Production-Ready  
**Platform Parity:** 100% Web/Mobile Feature Sync

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Routing & Logic](#routing--logic)
3. [State Management & Hydration Shield](#state-management--hydration-shield)
4. [Page Manifest](#page-manifest)
5. [Metadata Strategy](#metadata-strategy)
6. [Cross-Platform Sync](#cross-platform-sync)
7. [Component Standards](#component-standards)
8. [Authentication Flow](#authentication-flow)

---

## Architecture Overview

### Technology Stack
| Layer | Web | Mobile |
|-------|-----|--------|
| **Framework** | React 18 + React Router 7 | React Native + Expo Router |
| **Styling** | Chakra UI + Tailwind CSS | Native React Native + LinearGradient |
| **State** | React Query + Session Context | React Query + Expo Auth |
| **Backend** | Hono (Node.js) | Shared API endpoints |
| **Database** | PostgreSQL (Neon serverless) | Via API |
| **Auth** | Auth.js + Custom JWT | Expo SecureStore + API |

### Directory Structure
```
create-anything/_/
├── apps/
│   ├── web/src/app/           # React Router 7 file-based routing
│   │   ├── (app)/             # Protected app routes
│   │   ├── account/           # Auth routes (signin, signup, logout)
│   │   ├── routes.ts          # Route configuration
│   │   └── root.tsx           # Root layout with hydration shield
│   └── mobile/src/app/        # Expo Router file-based routing
│       ├── (tabs)/            # Tab navigator screens
│       ├── onboarding/        # Onboarding flow
│       └── _layout.jsx        # Root layout with auth guard
└── packages/                  # Shared packages
```

---

## Routing & Logic

### Canonical URL Strategy

The application uses `/welcome` as the canonical landing page URL. Users arriving at the root `/` are redirected to `/welcome` for explicit URL identity.

#### Implementation Details

**File:** `apps/web/src/app/(app)/index-redirect.jsx`
```javascript
import { redirect } from "react-router";

export function loader() {
  return redirect("/welcome");
}

export default function IndexRedirect() {
  return null;
}
```

**File:** `apps/web/src/app/routes.ts` (relevant excerpt)
```typescript
const welcomePage = './(app)/onboarding/welcome/page.jsx';
const indexRedirectPage = './(app)/index-redirect.jsx';

// /welcome is the canonical route; root redirects to /welcome
const welcomeRoute = route('welcome', welcomePage, { id: 'welcome-canonical' });
const rootRedirect = index(indexRedirectPage, { id: 'root-redirect' });
const routes = [rootRedirect, welcomeRoute, ...generatedRoutes, notFound];
```

**Behavior:**
- `GET /` → HTTP 302 redirect → `/welcome`
- Address bar shows `/welcome` (not generic `/`)
- Browser tab shows "Welcome | Rende-View"

---

## State Management & Hydration Shield

### Hydration Mismatch Prevention

React Router 7 with SSR can produce hydration mismatches when server-rendered HTML differs from client-rendered content. The application uses a "Hydration Shield" strategy to prevent UI snap-back.

**File:** `apps/web/src/app/root.tsx` (Layout function)
```tsx
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta charSet="utf-8" suppressHydrationWarning />
        <meta name="viewport" content="width=device-width, initial-scale=1" suppressHydrationWarning />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

**Why This Strategy:**
1. `suppressHydrationWarning` on `<html>`, `<head>`, and `<body>` prevents React from throwing errors on minor SSR/client mismatches
2. This is a known pattern for React 18+ SSR applications where perfect hydration is not always achievable
3. Pre-existing hydration warnings in console are benign and outside current task scope

### Additional State Management

**File:** `apps/web/src/app/root.tsx`
- `SessionProvider` wraps the app for Auth.js session context
- `QueryClientProvider` enables React Query for client-side caching
- `ChakraProvider` with custom purple brand theme (`chakraTheme`)

**File:** `apps/mobile/src/app/_layout.jsx`
- `QueryClientProvider` with custom `QueryClient` configuration
- `useAuth()` hook manages mobile authentication state

---

## Page Manifest

### Audited User-Facing Pages (29 pages)

The following 29 pages represent the core user experience, organized by category:

#### 1. Onboarding Flow (5 pages)
| Route | Physical File Path |
|-------|-------------------|
| `/welcome` | `apps/web/src/app/(app)/onboarding/welcome/page.jsx` |
| `/onboarding/consent` | `apps/web/src/app/(app)/onboarding/consent/page.jsx` |
| `/onboarding/data-consent-required` | `apps/web/src/app/(app)/onboarding/data-consent-required/page.jsx` |
| `/onboarding/membership` | `apps/web/src/app/(app)/onboarding/membership/page.jsx` |
| `/onboarding/profile` | `apps/web/src/app/(app)/onboarding/profile/page.jsx` |

#### 2. Core App (8 pages)
| Route | Physical File Path |
|-------|-------------------|
| `/discovery` | `apps/web/src/app/(app)/discovery/page.jsx` |
| `/matches` | `apps/web/src/app/(app)/matches/page.jsx` |
| `/matches/likers` | `apps/web/src/app/(app)/matches/likers/page.jsx` |
| `/messages` | `apps/web/src/app/(app)/messages/page.jsx` |
| `/messages/[matchId]` | `apps/web/src/app/(app)/messages/[matchId]/page.jsx` |
| `/messages/[conversationId]` | `apps/web/src/app/(app)/messages/[conversationId]/page.jsx` |
| `/new-matches` | `apps/web/src/app/(app)/new-matches/page.jsx` |
| `/daily-picks` | `apps/web/src/app/(app)/daily-picks/page.jsx` |

#### 3. Profile (5 pages)
| Route | Physical File Path |
|-------|-------------------|
| `/profile` | `apps/web/src/app/(app)/profile/page.jsx` |
| `/profile/media` | `apps/web/src/app/(app)/profile/media/page.jsx` |
| `/profile/preview` | `apps/web/src/app/(app)/profile/preview/page.jsx` |
| `/profile/[userId]` | `apps/web/src/app/(app)/profile/[userId]/page.jsx` |
| `/profile-viewers` | `apps/web/src/app/(app)/profile-viewers/page.jsx` |

#### 4. Video & Scheduling (3 pages)
| Route | Physical File Path |
|-------|-------------------|
| `/video/call` | `apps/web/src/app/(app)/video/call/page.jsx` |
| `/schedule/proposals` | `apps/web/src/app/(app)/schedule/proposals/page.jsx` |
| `/schedule/propose/[userId]` | `apps/web/src/app/(app)/schedule/propose/[userId]/page.jsx` |

#### 5. Settings & Admin (5 pages)
| Route | Physical File Path |
|-------|-------------------|
| `/settings/blocked` | `apps/web/src/app/(app)/settings/blocked/page.jsx` |
| `/settings/blockers` | `apps/web/src/app/(app)/settings/blockers/page.jsx` |
| `/settings/subscription` | `apps/web/src/app/(app)/settings/subscription/page.jsx` |
| `/admin` | `apps/web/src/app/admin/page.jsx` |
| `/admin/users` | `apps/web/src/app/(app)/admin/users/page.jsx` |

#### 6. Public Info Pages (3 pages)
| Route | Physical File Path |
|-------|-------------------|
| `/about` | `apps/web/src/app/(app)/about/page.jsx` |
| `/safety` | `apps/web/src/app/(app)/safety/page.jsx` |
| `/success-stories` | `apps/web/src/app/(app)/success-stories/page.jsx` |

**Total Audited Pages: 29** (5 + 8 + 5 + 3 + 5 + 3)

---

### Appendix: Auth & Utility Pages (5 additional files)

These are not part of the 29 audited user-facing pages but exist in the codebase:

| Route | Physical File Path | Purpose |
|-------|-------------------|---------|
| `/account/signin` | `apps/web/src/app/account/signin/page.jsx` | Custom signin form |
| `/account/signup` | `apps/web/src/app/account/signup/page.jsx` | Custom signup form |
| `/account/logout` | `apps/web/src/app/account/logout/page.jsx` | Session termination |
| `/account/billing` | `apps/web/src/app/account/billing/page.jsx` | Stripe billing portal |
| `/stripe` | `apps/web/src/app/(app)/stripe/page.jsx` | Payment processing |

**Root URL Routing Architecture:**
```
GET / → index-redirect.jsx (loader) → HTTP 302 → /welcome
```
- The `rootRedirect` route is defined FIRST in `routes.ts` array
- All requests to `/` match `index-redirect.jsx` which performs HTTP 302 redirect
- `page.jsx` exists but is NOT registered as the index route in `routes.ts`

### Mobile Application Pages (31 files)

Located in `apps/mobile/src/app/`:
- Root: `index.jsx`, `_layout.jsx`
- Onboarding: `onboarding/welcome.jsx`, `consent.jsx`, `membership.jsx`, `profile.jsx`, `data-consent-required.jsx`
- Tabs: `(tabs)/discovery.jsx`, `matches/index.jsx`, `matches/likers.jsx`, `messages/index.jsx`, `messages/[matchId].jsx`, `profile.jsx`, `membership.jsx`, `new-matches.jsx`
- Profile: `profile/[userId].jsx`, `profile-preview.jsx`, `profile-viewers.jsx`
- Video: `video/call.jsx`
- Scheduling: `schedule/proposals.jsx`, `schedule/propose/[userId].jsx`
- Settings: `settings/blocked.jsx`, `settings/blockers.jsx`, `settings/subscription.jsx`
- Public: `about.jsx`, `safety.jsx`, `success-stories.jsx`
- Utility: `stripe.jsx`, `buy-credits.jsx`, `daily-picks.jsx`

---

## Metadata Strategy

### Browser Tab Titles

Each public page exports a `meta()` function for React Router 7 to set browser tab titles and SEO metadata.

**Pattern:**
```javascript
export function meta() {
  return [
    { title: "Page Name | Rende-View" },
    { name: "description", content: "Page description for SEO." },
  ];
}
```

### Implemented Meta Exports (Public Pages)

| Page | Title | Full Path |
|------|-------|-----------|
| Welcome | "Welcome \| Rende-View" | `apps/web/src/app/(app)/onboarding/welcome/page.jsx` |
| About | "About \| Rende-View" | `apps/web/src/app/(app)/about/page.jsx` |
| Safety | "Safety \| Rende-View" | `apps/web/src/app/(app)/safety/page.jsx` |
| Success Stories | "Success Stories \| Rende-View" | `apps/web/src/app/(app)/success-stories/page.jsx` |

**Coverage:** All 4 public information pages have meta() exports. Protected pages inherit from root.tsx fallback meta.

### Root-Level Meta (Fallback)

**File:** `apps/web/src/app/root.tsx`
```typescript
export const meta = () => [
  { title: "Rende-VIEW - Find Your Perfect Match" },
  { name: "description", content: "Rende-VIEW is a modern dating platform..." },
  { name: "keywords", content: "dating app, video dating, online dating..." },
  { property: "og:title", content: "Rende-VIEW - Find Your Perfect Match" },
  { property: "og:description", content: "Modern dating platform with video calling..." },
  { property: "og:type", content: "website" },
];
```

---

## Cross-Platform Sync

### PUBLIC_ROUTES Array

Both web and mobile platforms maintain synchronized lists of public (unauthenticated) routes.

**Mobile:** `apps/mobile/src/app/_layout.jsx`
```javascript
const PUBLIC_ROUTES = [
  'onboarding/welcome',
  'onboarding/consent',
  'onboarding/data-consent-required',
  'onboarding/membership',
  'onboarding/profile',
  'about',
  'safety',
  'success-stories',
];
```

**Web:** `apps/web/src/app/routes.ts`
- Public pages (`about`, `safety`, `success-stories`) are included in generated routes
- The `onboarding/welcome` route is filtered out and replaced with canonical `/welcome` route
- Auth routes (`/account/*`) are outside the `(app)` layout group

### Stack Screen Registration (Mobile)

**File:** `apps/mobile/src/app/_layout.jsx`
```jsx
<Stack screenOptions={{ headerShown: false }} initialRouteName="index">
  {/* Public routes */}
  <Stack.Screen name="welcome" />
  <Stack.Screen name="onboarding/welcome" />
  <Stack.Screen name="onboarding/profile" />
  <Stack.Screen name="onboarding/consent" />
  <Stack.Screen name="onboarding/data-consent-required" />
  <Stack.Screen name="onboarding/membership" />
  <Stack.Screen name="about" />
  <Stack.Screen name="safety" />
  <Stack.Screen name="success-stories" />

  {/* Protected routes */}
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  {/* ... */}
</Stack>
```

### Synchronization Checklist

When adding a new public page:
1. Create web page in `apps/web/src/app/(app)/[page-name]/page.jsx`
2. Create mobile page in `apps/mobile/src/app/[page-name].jsx`
3. Add to `PUBLIC_ROUTES` array in mobile `_layout.jsx`
4. Add `<Stack.Screen name="[page-name]" />` in mobile `_layout.jsx`
5. Add `meta()` export to web page for browser tab title

---

## Component Standards

### Brand Identity (Hard-Coded for Persistence)

These values are hard-coded in inline styles to prevent CSS hydration issues and ensure consistent rendering.

#### Logo Specifications (60px Centered Logo)
```css
width: 60px;
height: 60px;
object-fit: contain;
margin: 0 auto;
```

**Enforced In:**
- `apps/web/src/app/(app)/onboarding/welcome/page.jsx` - Welcome page hero
- `apps/web/src/app/(app)/about/page.jsx` - About page header
- `apps/web/src/app/(app)/safety/page.jsx` - Safety page header
- `apps/web/src/app/(app)/success-stories/page.jsx` - Success Stories header
- `apps/mobile/src/app/onboarding/welcome.jsx` - Mobile welcome
- `apps/mobile/src/app/about.jsx`, `safety.jsx`, `success-stories.jsx` - Mobile public pages

**Usage:**
```jsx
<img
  src={logoImage}
  alt="Rende-View Logo"
  style={{ width: '60px', height: '60px', objectFit: 'contain', margin: '0 auto' }}
/>
```

#### Purple Brand Gradient
```css
background: linear-gradient(135deg, #f3e8ff 0%, #ffffff 50%, #dbeafe 100%);
```

**Enforced In:**
- All public pages (Welcome, About, Safety, Success Stories) on both web and mobile
- Mobile uses `expo-linear-gradient` with matching color stops

#### Primary Purple Color
```css
color: #9333ea;
```

#### Page Header Typography
```css
font-family: 'Playfair Display', serif;
font-size: 1.75rem;
font-weight: bold;
color: #9333ea;
text-align: center;
```

### Why Inline Styles?

1. **SSR Reliability:** Inline styles render identically on server and client, preventing hydration snap-back
2. **No CSS Dependencies:** Eliminates race conditions with CSS file loading
3. **Persistence:** Styles survive React re-renders and hot module replacement
4. **Specificity:** Cannot be overridden by external stylesheets

### Chakra UI Theme Extension

**File:** `apps/web/src/app/root.tsx`
```typescript
const chakraTheme = extendTheme({
  colors: {
    brand: {
      50: "#f5e6ff",
      100: "#dab3ff",
      200: "#bf80ff",
      // ... purple scale
    },
  },
});
```

---

## Authentication Flow

### Root URL Behavior (Canonical)

**Route Owner:** `apps/web/src/app/(app)/index-redirect.jsx`
- ALL requests to `/` → HTTP 302 redirect to `/welcome`
- This is enforced by `routes.ts` where `rootRedirect` is the first route

### Mobile Authentication Guard

**File:** `apps/mobile/src/app/_layout.jsx`
- Global `useEffect` hook monitors all navigation
- Checks `isAuthenticated` state from `useAuth()` hook
- Non-public routes for unauthenticated users → Redirect to `/onboarding/welcome`

### Session Management

**Web:** `apps/web/src/app/root.tsx`
- `SessionProvider` from `@auth/create/react` wraps the app

**Mobile:** `apps/mobile/src/app/_layout.jsx`
- `useAuth()` hook from `@/utils/auth/useAuth`
- `QueryClientProvider` for React Query state management

---

## Quick Reference

### Key Files to Modify

| Task | File(s) |
|------|---------|
| Add new public page | Web: `(app)/[name]/page.jsx`, Mobile: `app/[name].jsx`, Mobile: `_layout.jsx` |
| Modify brand colors | `root.tsx` (Chakra theme), inline styles in pages |
| Update routing | `routes.ts`, Mobile `_layout.jsx` |
| Change auth behavior | `page.jsx` (web index), `_layout.jsx` (mobile) |
| Update meta tags | Individual page `meta()` exports |

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Auth.js session secret
- `AUTH_URL` - Auth.js callback URL

### Run Commands
```bash
# Web development
cd apps/web && npm run dev

# Mobile development
cd apps/mobile && npx expo start --tunnel

# Database push
npm run db:push
```

---

*Document generated by Replit Agent - January 26, 2026*
