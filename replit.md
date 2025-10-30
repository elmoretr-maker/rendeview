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