# Create Anything - Dating App

## Overview
This project is a comprehensive dating/matching application featuring video calling, messaging, scheduling, and media uploads. Built with React Router 7 for the frontend, Hono for the backend server, and PostgreSQL (Neon serverless) for the database, it aims to provide a robust platform for user interaction. The application integrates Auth.js for authentication, Stripe for payments, Daily.co for video conferencing, and Replit Object Storage for photo/video uploads. The business vision is to deliver a feature-rich and scalable dating platform with a focus on user engagement and seamless communication.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application follows a client-server architecture. The frontend is a React 18 web application utilizing React Router 7 for navigation and TailwindCSS for styling, deployed at `create-anything/_/apps/web`. The backend is a Hono-based Node.js server, interacting with a PostgreSQL database hosted on Neon. Authentication is handled by Auth.js with a credentials provider. UI/UX design emphasizes a modern aesthetic with consistent styling adapted from a mobile-first approach, using components like Tinder-style profile cards with gradient overlays, prominent bio sections, and visually engaging photo galleries. Routing uses a Next.js-style route grouping (e.g., `(app)`) for organized file structure without affecting URLs. Core features include a Discovery page, Matches list, Messages with chat detail, and a comprehensive Profile management section. The application also includes an onboarding flow, scheduling proposal system, and a dedicated video call interface. An `ErrorBoundary` component is implemented for graceful error handling, and API responses are enriched to minimize multiple calls and improve performance.

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

## Recent Changes (October 30, 2025)
- **Photo/Video Upload Feature**: Implemented complete file upload functionality for user profiles using Replit Object Storage
  - Built object storage infrastructure (objectStorage.ts, objectAcl.ts) with ACL-based access control
  - Created three API endpoints: /api/objects/upload (presigned URLs), /api/objects/[[...objectPath]] (download with ACL checks), /api/profile/media (save/delete media)
  - Developed ObjectUploader React component using Uppy for modal-based file uploads with progress tracking
  - Enhanced Profile page with upload buttons for photos (up to 5, 10MB each) and videos (1, 50MB max)
  - Added delete functionality and primary photo selection with beautiful empty states
  - Configured ACL policies: profile photos/videos are public (visible to all users), owned by uploader
  - Media stored in `profile_media` table with columns: id, user_id, type, url, sort_order, created_at, duration_seconds

- **4-Tier Membership System**: Implemented comprehensive tier-based limits for media, video chat, and meetings
  - Created centralized membership tier utility (src/utils/membershipTiers.js) with constants and helper functions
  - **Tier Structure**:
    - Free: 2 photos, 1 video (15s max), 5 min chat, 3 meetings/day cap
    - Casual ($9.99/mo): 6 photos, 3 videos (30s max each), 15 min chat, unlimited meetings
    - Dating ($29.99/mo): 10 photos, 1 video (60s max), 25 min chat, unlimited meetings
    - Business ($49.99/mo): 20 photos, 1 video (5 min max), 45 min chat, unlimited meetings
  - Updated Profile page with tier-based upload limits, remaining slots display, and upgrade prompts
  - Redesigned Membership page showing all 4 tiers with detailed benefits and $8/10min extension pricing
  - Enhanced Onboarding pages (photos, video) with tier-aware limits and ObjectUploader integration
  - Implemented Video Call page with:
    - Session time tracking based on lowest tier between both users
    - Visual countdown timer showing remaining time
    - Warning at 1 minute remaining
    - Extension purchase option ($8 for 10 additional minutes)
  - Backend API enforcement:
    - Free tier meeting cap (3 meetings per day) with automatic daily reset
    - Meeting counter incrementation in auth_users table
    - Error messages prompting users to upgrade when limits are reached
  - Database schema updates:
    - Added video_meetings_count (integer) to auth_users for tracking free tier usage
    - Added last_video_meeting_at (timestamp) to auth_users for daily reset logic
    - Added duration_seconds (integer) to profile_media for video duration validation

- **Real-Time Video Call Extension System**: Implemented synchronized payment-based call extension feature
  - Database schema:
    - Extended video_sessions table: base_duration_seconds, extended_seconds_total, state, grace_expires_at
    - Created video_session_extensions table to track extension requests, payment status, and metadata
  - API endpoints (5 total):
    - GET /api/video/sessions/[id] - Returns session state with remaining time and extensions
    - POST /api/video/sessions/[id]/extensions - Initiates extension request (creates pending extension)
    - PUT /api/video/sessions/[id]/extensions/[extId] - Accept/decline extension (creates Stripe PaymentIntent)
    - POST /api/video/sessions/[id]/extensions/[extId]/confirm - Confirms payment and atomically adds time
  - Frontend video call page features:
    - Smart polling (2s active, 500ms during grace/pending) for real-time synchronization
    - Extend Call button appears when ≤2 minutes remain or during grace period
    - Three modals: request extension, respond to extension, Stripe payment form
    - Synchronized timer display visible to both users
    - 20-second grace period with auto-redirect to profile pages after expiry
    - Retained End Call and Report buttons throughout
  - Security:
    - Payment validation: validates PaymentIntent ID, amount ($8.00), and metadata before adding time
    - Prevents payment bypass attacks (can't reuse old PaymentIntent IDs)
    - Client-side-only rendering for Stripe Elements (prevents SSR issues)
  - Extension flow: Initiator requests → Responder accepts/declines → Initiator pays via Stripe → Server validates → 10 minutes added to both users

- **React Hydration Fix**: Resolved pre-existing hydration errors in root.tsx
  - Added typeof window checks to all hooks that access DOM APIs (useHandshakeParent, useCodeGen, useRefresh)
  - Fixed Layout component's useEffect hooks to only run client-side
  - Eliminated "Hydration failed" and "Invalid hook call" console warnings
  - Ensures consistent server/client rendering without fallback to client-only mode

- **UX Enhancements & Business Logic**: Implemented navigation improvements and polite upgrade nudges
  - **Navigation Enhancement**: Added Membership link with Crown icon to AppHeader for easy access from any screen
  - **Meeting Cap Nudge**: Toast notification when Free user starts their 3rd (final) meeting
    - Polite reminder about upgrade benefits (Casual tier: unlimited meetings, 15-min calls)
    - Correctly handles daily reset logic to prevent false positives
  - **Time Limit Nudge**: Non-intrusive banner at 4-minute mark (60 seconds remaining) for Free users
    - Dismissible X button in top-right corner
    - Optional Upgrade button navigating to membership page
    - Only shows once per session
  - All nudges target Free tier users only and use encouraging, non-pushy messaging

- **Critical UX Fixes** (October 30, 2025): Resolved navigation and empty state issues
  - **Navigation Bar Fix**: AppHeader now displays consistently on ALL authenticated pages in ALL states
    - Present on: Discovery, Matches, Messages, Profile, Settings/Blocked pages
    - Renders during: Loading, error, and success states
    - Correctly hidden on: Video Call page only
  - **Matches Page Empty State**: Updated message to "You have no matches yet. Start exploring the Discovery feed!"
  - **Blocked Users Management**: New dedicated page at /settings/blocked
    - Database: Added notes column to blockers table
    - API: PATCH endpoint for updating notes, GET includes notes field
    - Features: Block dates display, private notes with save functionality, unblock button
  - **Button Functionality Audit**: Verified all action buttons working correctly
    - Like Button: ✓ Working (Discovery + Profile pages)
    - Pass Button: ✓ Working (Discovery + Profile pages)  
    - Schedule Button: ✓ Working (Profile page)
    - Report Button: ✓ Working (Video Call page)
    - End Call Button: ✓ Working (Video Call page)
    - Stop Chat Button: Not implemented (confirmed)

- **Safety Moderation System (4-Strike Logic)** (October 30, 2025): Comprehensive user safety implementation
  - **Database Schema**: Added three columns to auth_users table
    - block_count (integer, default 0): Tracks how many times a user has been blocked by others
    - flagged_for_admin (boolean, default false): Marks users for admin review
    - account_status (varchar, default 'active'): Tracks account status ('active', 'under_review')
  - **3-Strike Warning**: When a user receives their 3rd block
    - Automatically flags user for admin review (flagged_for_admin = true)
    - Shows warning to blocker: "This user has been blocked by 3 people and has been flagged for admin review"
    - Alerts moderators to potential problematic behavior
  - **4-Strike Account Review**: When a user receives their 4th block (or more)
    - Account status automatically set to 'under_review'
    - User remains flagged for admin review
    - Warning message includes total block count
  - **Frontend Integration**: Discovery and Profile pages display safety warnings
    - Toast notifications appear when blocking triggers 3+ strike thresholds
    - Warnings include blocked user's name and current block count
    - 6-second display duration for visibility

- **Video Call End Functionality** (October 30, 2025): CRITICAL missing endpoint implemented
  - **PATCH Endpoint**: Created /api/video/sessions/[id] endpoint
    - Handles video session state updates (active, ended, grace_period)
    - Validates user is a participant before allowing changes
    - Sets ended_at timestamp when call is terminated
    - Returns error if session not found or user not authorized
  - **Frontend Integration**: End Call button now fully functional
    - Calls PATCH endpoint to mark session as 'ended'
    - Invalidates video-sessions query cache
    - Routes user back to their profile page
    - Both parties can end the call independently