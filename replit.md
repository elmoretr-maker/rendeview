# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application providing video calling, messaging, scheduling, and media uploads. It aims to deliver a robust and scalable platform focused on user engagement and seamless communication. The business vision is to capture a significant share of the online dating market by offering a superior user experience and advanced features, driving high user retention and monetization through a tiered membership model. The mobile application is production-ready, transitioning to EAS (Expo Application Services) for deployment with full native functionality. **As of November 2025, the project has achieved 100% aesthetic parity between web and mobile platforms, with consistent Inter font family implementation across all 8 mobile screens.**

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application utilizes a client-server architecture. The frontend uses React 18 with React Router 7 for navigation. The web application leverages Chakra UI for its component library, progressively phasing out TailwindCSS. The mobile application achieves aesthetic parity using native React Native components and consistent styling. The backend is built with Hono (Node.js) and interacts with a PostgreSQL database. Auth.js handles authentication.

Key features include:
- **UI/UX**: Mobile-first design with Tinder-style profile cards, gradient overlays, and a consistent purple brand theme (`#7c3aed` web, `#5B3BAF` mobile). **100% aesthetic parity achieved** with Inter font family (Inter_400Regular, Inter_600SemiBold, Inter_700Bold) implemented across all 8 mobile screens: welcome, onboarding (consent, membership, profile), tabs (membership, profile), profile-preview, and settings/subscription. All text components include font loading guards to prevent system font flash.
- **Core Features**: Discovery, Matches, Messages with real-time chat, Profile management, and a consolidated onboarding flow. Includes smart matching with prioritization, mutual interests, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery.
- **Membership Model**: A 4-tier system (Free, Casual, Dating, Business) governs media limits, chat durations, and meeting caps, enforced client-side and via API.
- **Video Calling**: Real-time video call extension system with synchronized timers and integration for paid extensions.
- **Media Management**: Supports photo uploads and camera-only video recording with tier-based limits.
- **Authentication & Security**: Global authentication guard, two-step authentication including onboarding completion checks (consent, membership, photos). Security measures include webhook monitoring, idempotency keys, database-backed rate limiting, and database constraints.
- **Chat Monetization**: Hybrid chat monetization with a three-pool message deduction and per-match caps for the Business tier, credit packs available.
- **Matching System**: Enhanced matching incorporates a comprehensive interests system and a weighted scoring algorithm (v2) for compatibility calculation.
- **Admin Dashboard**: Features user photo management, revenue overview, and pricing settings for subscription tiers and second date fees.
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
- **Mobile UI Components**: @react-native-community/slider, @expo-google-fonts/inter