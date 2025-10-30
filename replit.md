# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application providing video calling, messaging, scheduling, and media uploads. It aims to deliver a robust and scalable platform focused on user engagement and seamless communication, leveraging React Router 7, Hono, and PostgreSQL.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application employs a client-server architecture. The frontend, located at `create-anything/_/apps/web`, is a React 18 application with React Router 7 for navigation and TailwindCSS for styling. The backend is a Hono-based Node.js server, interacting with a PostgreSQL database on Neon. Auth.js handles authentication. The UI/UX features a modern, mobile-first design with Tinder-style profile cards, gradient overlays, and organized photo galleries. Routing uses Next.js-style route grouping (e.g., `(app)`). Key features include Discovery, Matches, Messages with chat, Profile management, an onboarding flow, scheduling, and video calling. An `ErrorBoundary` ensures graceful error handling, and API responses are optimized for performance. The system incorporates a 4-tier membership system governing media limits, chat durations, and meeting caps, enforced both client-side and via backend API. A real-time video call extension system allows users to extend calls through payment, with synchronized timers and grace periods. Safety features include a 4-strike moderation logic that flags users for admin review and modifies account status based on block counts.

## External Dependencies
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Auth.js
- **Payment**: Stripe
- **Video Conferencing**: Daily.co
- **Object Storage**: Replit Object Storage (Google Cloud Storage via sidecar)
- **File Upload UI**: Uppy (@uppy/core, @uppy/react, @uppy/aws-s3)
- **Frontend Framework**: React 18
- **Frontend Router**: React Router 7
- **Styling**: TailwindCSS
- **Backend Framework**: Hono (Node.js)
## Recent Changes (October 30, 2025 - Latest)

- **Card Carousel Discovery UI** (October 30, 2025): Replaced static discovery page with dynamic swipeable card carousel
  - Implemented Tinder-style swipeable cards using Framer Motion
  - Cards support drag gestures (swipe left to pass, swipe right to like)
  - Stacked card view showing up to 3 profiles at once with depth effect
  - Smooth entrance/exit animations with rotation and opacity transitions
  - Preserved all existing functionality: tap to view profile, Pass/Like buttons, mutations
  - Cards only removed from view after successful API mutation (prevents data loss on errors)
  - Added Reset button to restore all swiped cards in current session
  - Profile counter shows current position (X of Y)
  - Files updated: discovery/page.jsx

- **Test Profile Seeding** (October 30, 2025): Created comprehensive test data for development
  - Added /api/admin/seed-profiles endpoint generating 6 diverse profiles
  - Each profile includes complete bio, primary photo, 3 additional photos, and working video
  - Profiles span different membership tiers (Dating, Casual, Business)
  - All test users accessible with password "testpass123"
  - Proper data persistence to auth_users and profile_media tables
  - Files updated: api/admin/seed-profiles/route.js

- **Onboarding Flow Fix** (October 30, 2025): Fixed new user routing and onboarding flow
  - Root page (/) now properly checks user onboarding status before routing
  - Unauthenticated users → /onboarding/welcome (landing page)
  - Missing membership_tier → /onboarding/membership
  - Missing name/profile → /onboarding/profile  
  - Missing consent → /onboarding/consent
  - Fully onboarded users → /discovery
  - Removed QA_BYPASS logic from root page for proper production behavior
  - Fixed welcome page logo using static import to prevent SSR hydration mismatches
  - Files updated: page.jsx (root), welcome/page.jsx

- **Navigation Improvements** (October 30, 2025): Enhanced authentication pages with back navigation
  - Added "Back" button to both Sign In and Sign Up pages
  - Button positioned at top-left corner with left arrow icon
  - Navigates to Welcome page (/onboarding/welcome)
  - Includes smooth hover animation (arrow slides left on hover)
  - Aesthetically matches page design with subtle gray styling
  - Improves user flow by allowing easy return to welcome/landing page
  - Files updated: signin/page.jsx, signup/page.jsx
