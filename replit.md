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

- **Photos & Videos Management Page** (October 30, 2025): Created comprehensive media management system with camera-only video recording
  - **Photo Upload**: Users can upload photos via ObjectUploader component with tier-based limits (Free: 3, Casual: 5, Dating: 8, Business: 10)
  - **Camera-Only Video Recording**: Mobile-first VideoRecorderModal component records video directly from webcam/camera to prevent catfishing
  - **Real-time Recording UI**: Live preview, countdown timer, recording indicator, and redo functionality
  - **Tier-Based Video Limits**: Video count and duration enforced by membership (Free: 1x15s, Casual: 1x30s, Dating: 2x60s, Business: 3x5min)
  - **Media Gallery**: Grid view for photos and videos with hover-to-delete functionality
  - **Object Storage Integration**: Direct upload to Replit Object Storage using presigned URLs
  - **Navigation**: Added prominent card on Profile page linking to /profile/media
  - Database integration via existing /api/profile/media endpoints for create/delete operations
  - Files created: profile/media/page.jsx with integrated VideoRecorderModal component
  - Profile page updated with navigation card featuring Image icon and descriptive text

- **Enhanced Smart Matching System** (October 30, 2025): Implemented comprehensive matching features to increase user connections
  - **Interactive Likers Page**: Users can now like/pass directly from /matches/likers page with match celebration on reciprocal likes
  - **Smart Discovery Prioritization**: Discovery algorithm now prioritizes users who liked you first, then active users, then everyone else
  - **Mutual Interests Highlighting**: Discovery cards show "Shared Interests" badges and display up to 3 common interests with match percentage
  - **Activity-Based Matching**: Added last_active tracking, "Online Now" indicators, and prioritization of recently active users
  - **Conversation Starters**: Chat interface displays 4 pre-written conversation starters when no messages exist yet
  - **Daily Picks Feature**: New /daily-picks page with 10 curated matches selected daily using compatibility algorithm (interests + activity + membership)
  - **Reverse Discovery**: New /profile-viewers page shows who viewed your profile in last 7 days with Like/Pass actions
  - Database additions: interests (JSONB) and last_active (timestamp) columns to auth_users; profile_views and daily_picks tables created
  - All discovery and interaction endpoints now update last_active timestamp for accurate activity tracking
  - Files updated: likers/page.jsx, discovery/list/route.js, discovery/page.jsx, messages/[matchId]/page.jsx, daily-picks/route.js, daily-picks/page.jsx, profile-views/route.js, profile-viewers/page.jsx, api/utils/auth.js

## Recent Changes (Continued)

- **New Matches Celebration Feature** (October 30, 2025): Implemented celebratory new matches experience with dedicated page and notifications
  - Added database columns `viewed_by_user_a` and `viewed_by_user_b` to matches table for tracking viewed state per user
  - Created /api/new-matches endpoint returning unviewed matches for current user
  - Created /api/mark-match-viewed endpoint to mark matches as viewed when user navigates to chat
  - Built celebratory New Matches page (/new-matches) showing all unviewed matches with animated entry
  - Added MatchCelebration modal component with confetti animation, sparkles, and profile display
  - Modal triggers automatically when mutual like creates a match in Discovery
  - Navigation bar includes new "New Matches" link with Heart icon and badge showing unviewed count
  - Badge updates in real-time via React Query (30s polling) and query invalidation after actions
  - Existing Matches page now filters to show only viewed matches (user has interacted with them)
  - Fixed QueryClient security issue: moved from module-scoped to per-request instance using useState
  - Resolved routing conflicts by moving endpoints outside /api/matches/* namespace
  - Files updated: root.tsx (QueryClientProvider), AppHeader.jsx, new-matches/page.jsx, MatchCelebration.jsx, discovery/page.jsx, matches/all/route.js, new-matches/route.js, mark-match-viewed/route.js

## Recent Changes (Continued)

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

- **Consolidated Onboarding Flow Restructure** (October 31, 2025): Major onboarding architecture overhaul for streamlined user experience
  - **NEW FLOW**: Welcome → Consent (Step 2) → Membership (Step 3) → Payment → Profile Setup (Step 4) → Main App
  - **Consolidated Profile Page**: Combined name, bio, interests, photo uploads, and camera-only video recording into single comprehensive onboarding/profile page
    - Users enter name (required), bio (optional, 500 chars), and interests/hobbies (up to 10)
    - Inline photo upload with tier-based limits (2 photos minimum required to continue)
    - Integrated VideoRecorderModal for optional camera-only video introduction
    - All media management features from profile/media now available during onboarding
    - Enforces anti-catfishing: camera-only video recording (no file uploads)
  - **Consent Moved Earlier**: Data consent now Step 2 (before membership selection) with back navigation to welcome page
  - **Enhanced Payment Flow**: Stripe page now shows "Continue to Profile Setup" button after successful payment, with cancel/back options
  - **Back Navigation**: Added consistent back buttons across all onboarding pages (consent, membership, profile)
  - **Removed Redundant Pages**: Deleted separate photos, video, and media onboarding pages from web app (consolidated into profile)
  - **Updated Root Routing**: Root page (/) now checks consent → membership → profile in correct order
  - **Progress Indicators**: Updated all pages to show Step X of 4 (reduced from 5 steps)
  - Files updated: 
    - onboarding/profile/page.jsx (fully rewritten with consolidated features)
    - onboarding/consent/page.jsx (moved to step 2, added back button)
    - onboarding/membership/page.jsx (updated to step 3, added back button)
    - stripe/page.jsx (added "Continue to Profile Setup" button and enhanced UX)
    - onboarding/welcome/page.jsx (routes to consent instead of signup)
    - page.jsx root (updated routing logic for new flow order)
  - Files removed: onboarding/photos/page.jsx, onboarding/video/page.jsx, onboarding/media/page.jsx
  - **Mobile App**: Similar consolidation pending (media.jsx already has most features, needs profile integration)
