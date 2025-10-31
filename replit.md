# Create Anything - Dating App

## Overview
This project is a feature-rich dating/matching application providing video calling, messaging, scheduling, and media uploads. It aims to deliver a robust and scalable platform focused on user engagement and seamless communication. The business vision is to capture a significant share of the online dating market by offering a superior user experience and advanced features not commonly found in competitors, thereby driving high user retention and monetization through a tiered membership model.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application utilizes a client-server architecture. The frontend, a React 18 application, employs React Router 7 for navigation and TailwindCSS for styling, with a mobile-first UI/UX featuring Tinder-style profile cards and gradient overlays. Routing uses Next.js-style route grouping. The backend is built with Hono (Node.js) and interacts with a PostgreSQL database. Auth.js handles authentication. Key features include Discovery, Matches, Messages with chat, Profile management, a consolidated onboarding flow (Welcome → Consent → Membership → Payment → Profile Setup → Main App), scheduling, and video calling. An `ErrorBoundary` ensures graceful error handling. The system incorporates a 4-tier membership model (Free, Casual, Dating, Business) governing media limits, chat durations, and meeting caps, enforced both client-side and via backend API. A real-time video call extension system allows paid extensions with synchronized timers. Safety features include a 4-strike moderation logic. Core features include smart matching with prioritization, mutual interests highlighting, activity-based matching, conversation starters, Daily Picks, and Reverse Discovery (profile viewers). Media management supports photo uploads and camera-only video recording with tier-based limits. Revenue-protection downgrade flows are implemented for subscription management, allowing scheduled tier changes without immediate refunds.

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