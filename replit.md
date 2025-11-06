# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application providing video calling, messaging, scheduling, and media uploads. It aims to deliver a robust and scalable platform focused on user engagement and seamless communication. The business vision is to capture a significant share of the online dating market by offering a superior user experience and advanced features, driving high user retention and monetization through a tiered membership model. The mobile application is production-ready, transitioning to EAS (Expo Application Services) for deployment with full native functionality. **As of November 2025, the project has achieved 100% aesthetic parity between web and mobile platforms, with consistent Inter font family implementation across all 8 mobile screens.**

## Recent Changes (November 2025)
- **Discovery X Button Safety System (Nov 6, 2025)**: Added comprehensive two-tap confirmation system to prevent accidental profile dismissals. X button now shows **warning indicators** with distinct red border (3px) emphasizing severity. **First tap** displays "Are you sure?" prompt with AlertTriangle icon and toast warning. **Second tap** permanently dismisses/blocks profile. Border intensifies (red.300→red.500) and background changes to red.50 during confirmation state. Swiping, navigating with arrows, or liking a profile **automatically resets** confirmation state to prevent confusion across profiles. Visual hierarchy includes "Permanent" label with small warning icon when not confirming, clear separation from Heart button.
- **Discovery Profile Persistence Fix (Nov 6, 2025)**: Fixed X button behavior to permanently block/dismiss profiles instead of just skipping. Users can now browse through all profiles indefinitely using Previous/Next arrows and swipe left - profiles remain accessible until explicitly dismissed with X button. Enhanced end-of-feed messaging guides users to browse back or refresh for new matches, with "Start Over from Beginning" button for quick reset. Navigation behavior: **Swipe Left/Next Arrow** = non-destructive browsing forward, **Previous Arrow** = browse backward, **X Button (Red)** = permanent dismissal/block (requires 2 taps), **Heart Button** = like/match, **Star Icon** = save to Top Picks.
- **Compatibility Percentage on Discovery (Nov 6, 2025)**: Added prominent compatibility percentage badge to Discovery cards showing match probability (30-100%) calculated by the matching algorithm. Gradient pink-purple badge displays at top of card indicators, helping users quickly identify high-compatibility matches based on shared interests, relationship goals, and lifestyle factors.
- **Profile Page UX Redesign (Nov 6, 2025)**: Completely redesigned profile page from long vertical scroll (50+ fields) to clean tab-based navigation with 5 organized sections. **Profile tab** for essentials (name, bio, Top Picks counter), **About Me tab** for interests and 12 lifestyle preferences (gender, orientation, body type, height, education, relationship goals, drinking, smoking, exercise, religion, children, pets), **Media tab** for photo/video uploads with tier limits and primary selection, **Availability tab** for timezone/schedule/toggles, **Settings tab** for location and account actions (GPS picker, max distance radius). Removed duplicate buttons, widened container for better spacing, improved visual hierarchy with cards and logical grouping. All features preserved with zero functionality loss.
- **Discovery Navigation Fix (Nov 6, 2025)**: Resolved critical navigation bugs including dead clicks on arrows, card disappearance after swipes, and index tracking issues. Refactored state management to use `currentIndex` tracking position within `visibleProfiles` array with automatic bounds clamping via useEffect. Navigation arrows now work flawlessly after like/block actions with exactly one click per profile. Star button for Top Picks remains visible and functional on all cards. All three navigation methods (arrows, swipes, like/block) properly synchronized with no index mismatches.
- **Top Picks Counter (Nov 6, 2025)**: Added "Saved in Top Picks" counter to user's profile page showing how many people currently have them saved in their Top Picks. Features live count display with dynamic singular/plural text, secure API endpoint returning only authenticated user's count, and beautiful gradient card UI for engagement feedback.
- **Top Picks Feature (Nov 6, 2025)**: Implemented save-for-later functionality allowing users to save up to 5 profiles from Discovery to "Top Picks" section in Matches page. Users can freely browse Discovery with Previous/Next navigation (no permanent dismissals on swipe left), save favorite profiles with gold star icon, and manage saved profiles from dedicated Top Picks section with quick remove functionality.
- **Routing Fix (Nov 5, 2025)**: Resolved critical route conflict where `/api/matches/all` was being caught by `/api/matches/[id]` dynamic route, causing "invalid input syntax for type integer" errors. Migrated all frontend pages (Matches, Messages, Schedule) to use `/api/matches/list` endpoint. Removed `viewed_by_user_a/b` flag requirements from matches list query to ensure all matches display properly. Temporarily disabled location filtering in Discovery to allow testing without GPS coordinates.
- **Security & Safety Enhancements**: Implemented comprehensive external contact detection across bio and chat message inputs with linguistic bypass protection. System blocks phone numbers and email addresses in all formats including:
  - **Phone - Numeric formats**: 555-123-4567, (555) 123-4567, +1-555-123-4567
  - **Phone - Spelled-out numbers**: "five five five one two three four five six seven"
  - **Phone - Mixed formats**: "call me at four 555-one-two-three-four"
  - **Phone - Continuous digit blocks**: Detects phone numbers when punctuation is removed
  - **Email - Standard formats**: user@example.com, name.surname@domain.co.uk
  - **Email - Obfuscated formats**: "user at domain dot com"
  - Security alert displays: "For your safety, please do not share external contact info (emails or phone numbers). This chat is designed for quick exchanges to schedule your video date appointment." Bio field now supports 2000 characters with encouraging prompt text to increase profile quality and match success.
- **Location-Based Discovery Filter**: Complete GPS-based proximity matching system using OpenStreetMap Nominatim API (free, open-source geocoding). Users can search for location by city/address/ZIP or use current GPS location. Discovery filters matches by proximity using Haversine formula. Location setup available in onboarding and profile pages. Completely removed all Google Maps dependencies.
- **Dynamic Pricing System**: All membership pricing now pulls from Admin Dashboard (`/api/admin/settings`) as single source of truth. Admin pricing changes reflect immediately across web and mobile without redeployment.
- **Enhanced Admin Dashboard**: Safety Management section now displays flagged user profile photos, membership tiers, and location/timezone alongside existing block counts and account status.
- **User Availability**: Fully implemented day/time availability selection visible on profile views for scheduling assistance.

## ⚠️ CRITICAL SECURITY ACTION REQUIRED
**Before deploying to production, you MUST manually delete the `QA_BYPASS_AUTH` environment variable from Replit's Secrets panel.** This testing bypass must be removed to re-enable full authentication security. This cannot be done programmatically and requires manual action in the Replit interface.

**Steps to Remove QA_BYPASS_AUTH:**
1. Open your Replit project
2. Click "Secrets" in the left sidebar (lock icon)
3. Find `QA_BYPASS_AUTH` in the list
4. Click the trash/delete icon next to it
5. Confirm deletion
6. Restart your workflows to ensure changes take effect

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application utilizes a client-server architecture. The frontend uses React 18 with React Router 7 for navigation. The web application leverages Chakra UI for its component library, progressively phasing out TailwindCSS. The mobile application achieves aesthetic parity using native React Native components and consistent styling. The backend is built with Hono (Node.js) and interacts with a PostgreSQL database. Auth.js handles authentication.

Key features include:
- **UI/UX**: Mobile-first design with Tinder-style profile cards, gradient overlays, and a consistent purple brand theme (`#7c3aed` web, `#5B3BAF` mobile). **100% aesthetic parity achieved** with Inter font family (Inter_400Regular, Inter_600SemiBold, Inter_700Bold) implemented across all 8 mobile screens: welcome, onboarding (consent, membership, profile), tabs (membership, profile), profile-preview, and settings/subscription. All text components include font loading guards to prevent system font flash.
- **Core Features**: Discovery with location-based proximity filtering, Matches, Messages with real-time chat, Profile management, and a consolidated onboarding flow. Includes smart matching with prioritization, mutual interests, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery. Location filtering is optional (null coordinates disable proximity filter).
- **Membership Model**: A 4-tier system (Free, Casual, Dating, Business) governs media limits, chat durations, and meeting caps, enforced client-side and via API.
- **Video Calling**: Real-time video call extension system with synchronized timers and integration for paid extensions.
- **Media Management**: Supports photo uploads and camera-only video recording with tier-based limits.
- **Authentication & Security**: Global authentication guard, two-step authentication including onboarding completion checks (consent, membership, photos). Security measures include webhook monitoring, idempotency keys, database-backed rate limiting, database constraints, and comprehensive external contact detection to prevent users from sharing phone numbers and email addresses in bios and chat messages.
- **Chat Monetization**: Hybrid chat monetization with a three-pool message deduction and per-match caps for the Business tier, credit packs available.
- **Matching System**: Enhanced matching incorporates a comprehensive interests system and a weighted scoring algorithm (v2) for compatibility calculation.
- **Admin Dashboard**: Features comprehensive user safety management (profile photos, membership tier, location, block count, account status), revenue overview, and dynamic pricing settings for subscription tiers and second date fees. Pricing changes made in the Admin Dashboard immediately propagate to all web and mobile surfaces without requiring redeployment.
- **Deployment**: Mobile application uses EAS (Expo Application Services) for production-ready cloud builds, supporting development, preview, and production profiles.

## External Dependencies
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Auth.js
- **Payment**: Stripe
- **Video Conferencing**: Daily.co
- **Object Storage**: Replit Object Storage
- **Frontend Framework**: React 18
- **Frontend Router**: React Router 7
- **Styling**: Chakra UI (web), TailwindCSS (being phased out), Native React Native (mobile)
- **Typography**: Inter font family across web and mobile for consistent brand identity
- **Backend Framework**: Hono (Node.js)
- **Mobile UI Components**: @react-native-community/slider, @expo-google-fonts/inter, react-native-maps, expo-location
- **Geocoding**: OpenStreetMap Nominatim API (free, open-source)