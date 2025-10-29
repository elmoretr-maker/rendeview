# Create Anything - Dating App

## Overview
This project is a comprehensive dating/matching application featuring video calling, messaging, and scheduling. Built with React Router 7 for the frontend, Hono for the backend server, and PostgreSQL (Neon serverless) for the database, it aims to provide a robust platform for user interaction. The application integrates Auth.js for authentication, Stripe for payments, and Daily.co for video conferencing. The business vision is to deliver a feature-rich and scalable dating platform with a focus on user engagement and seamless communication.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear communication regarding the agent's actions and decisions.

## System Architecture
The application follows a client-server architecture. The frontend is a React 18 web application utilizing React Router 7 for navigation and TailwindCSS for styling, deployed at `create-anything/_/apps/web`. The backend is a Hono-based Node.js server, interacting with a PostgreSQL database hosted on Neon. Authentication is handled by Auth.js with a credentials provider. UI/UX design emphasizes a modern aesthetic with consistent styling adapted from a mobile-first approach, using components like Tinder-style profile cards with gradient overlays, prominent bio sections, and visually engaging photo galleries. Routing uses a Next.js-style route grouping (e.g., `(app)`) for organized file structure without affecting URLs. Core features include a Discovery page, Matches list, Messages with chat detail, and a comprehensive Profile management section. The application also includes an onboarding flow, scheduling proposal system, and a dedicated video call interface. An `ErrorBoundary` component is implemented for graceful error handling, and API responses are enriched to minimize multiple calls and improve performance.

## External Dependencies
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Auth.js
- **Payment**: Stripe
- **Video Conferencing**: Daily.co
- **Frontend Framework**: React 18
- **Frontend Router**: React Router 7
- **Styling**: TailwindCSS
- **Backend Framework**: Hono (Node.js)