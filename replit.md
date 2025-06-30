# Kolekta - Peer-to-Peer Cash Exchange Platform

## Overview

Kolekta is a real-time peer-to-peer cash exchange platform designed for commuters and daily use cases in the Philippines. The application helps users find nearby people to exchange cash denominations, solving the common problem of not having exact change. Built as a full-stack web application using React, Express, Firebase, and PostgreSQL.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API for authentication and location
- **Data Fetching**: TanStack Query for server state management
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion for smooth UI transitions

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Development**: tsx for development server with hot reload
- **Production**: esbuild for bundling server code

### Database Strategy
- **Primary Database**: Firebase Firestore for real-time features
- **Secondary Database**: PostgreSQL with Drizzle ORM (configured but not actively used)
- **Rationale**: Firebase provides real-time subscriptions essential for matching users and chat functionality, while PostgreSQL remains available for future structured data needs

## Key Components

### Authentication System
- Firebase Authentication for user management
- Email/password registration and login
- User profile management with ratings and verification status
- Context-based authentication state management

### Location Services
- HTML5 Geolocation API for user positioning
- Custom geohash implementation for proximity calculations
- Location-based matching within configurable radius
- Privacy-focused location handling

### Real-time Matching Engine
- Firestore real-time listeners for instant match notifications
- Algorithmic matching based on reciprocal exchange needs
- Distance-based filtering and sorting
- Match request system with acceptance/decline flow

### Chat System
- Real-time messaging between matched users
- Message persistence in Firestore
- Read receipts and typing indicators
- Integration with exchange workflow

### User Interface
- Progressive Web App (PWA) capabilities
- Mobile-first responsive design
- Glass morphism design language
- Comprehensive component library with shadcn/ui

## Data Flow

1. **User Registration**: User creates account → Profile stored in Firestore → Location permission requested
2. **Post Creation**: User creates exchange request → Stored in Firestore → Real-time matching begins
3. **Matching Process**: System finds reciprocal matches → Notifications sent → Users can accept/decline
4. **Exchange Coordination**: Matched users chat → Coordinate meeting → Complete exchange → Rate experience
5. **Data Persistence**: All interactions logged for user ratings and platform analytics

## External Dependencies

### Firebase Services
- **Authentication**: User management and security
- **Firestore**: Real-time database for posts, matches, and chat
- **Cloud Messaging**: Push notifications (configured)

### Third-party Libraries
- **@neondatabase/serverless**: Neon PostgreSQL driver
- **drizzle-orm**: Type-safe SQL operations
- **@radix-ui/**: Accessible UI primitives
- **sweetalert2**: Enhanced user notifications
- **react-hot-toast**: Toast notifications

### Development Tools
- **Replit Integration**: Development environment optimization
- **PostCSS**: CSS processing pipeline
- **ESLint/TypeScript**: Code quality and type safety

## Deployment Strategy

### Replit Configuration
- **Runtime**: Node.js 20 with PostgreSQL 16 module
- **Development**: `npm run dev` with hot reload on port 5000
- **Production**: `npm run build` then `npm run start`
- **Autoscale**: Configured for automatic scaling on Replit

### Build Process
1. Frontend build with Vite → Static assets to `dist/public`
2. Backend build with esbuild → Server bundle to `dist/index.js`
3. Static file serving integrated with Express

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- Firebase configuration embedded in client code

## Changelog

```
Changelog:
- June 27, 2025. Initial setup
- June 27, 2025. Comprehensive feature implementation completed:
  * Enhanced MapView component with Leaflet integration
  * Smart matching algorithm with proximity and rating-based scoring
  * Real-time notification system with Firebase integration
  * Comprehensive reporting system for disputes and no-shows
  * Business account application system with verification
  * Safe meetup locations recommendation system
  * Multi-step verification system (SMS and ID verification)
  * Enhanced chat system with exchange completion workflow
  * Real-time Firebase listeners for matches and notifications
  * Complete glass morphism UI implementation
  * All features from requirements document implemented
- June 27, 2025. Map improvements and Find Safe Exchange feature:
  * Fixed map tile loading with proper Leaflet CSS integration
  * Added real safe zone markers for Metro Manila locations
  * Implemented comprehensive Find Safe Exchange modal with advanced filtering
  * Added user post management (My Posts) with edit/delete functionality
  * Enhanced map controls with center location and zoom buttons
  * Fixed mobile responsiveness for location picker
  * Added sample exchange posts for demonstration
- June 27, 2025. Migration and match request fixes completed:
  * Successfully migrated project from Replit Agent to Replit environment
  * Fixed duplicate match request prevention with proper Firebase queries
  * Implemented reliable toast notifications using react-hot-toast
  * Fixed match button functionality across all components (Dashboard, Find Safe Exchange, Exchange Location Map)
  * Added proper duplicate request checking to prevent spam matching
  * All match actions now show success/error feedback to users
- June 28, 2025. Comprehensive exchange completion system implemented:
  * Fixed active exchanges display so both users can see confirmed matches
  * Implemented working chat system with proper messaging functionality
  * Added exchange completion modal with ratings and duration tracking
  * Created exchange history system with "Show All Exchanges" feature
  * Fixed time formatting errors in chat and notification systems
  * Improved UI alignment and partner name display in active exchanges
  * Both match initiators and acceptors now see active exchanges properly
- June 28, 2025. Critical real-time messaging and data integrity fixes:
  * Fixed real-time chat messages to appear immediately without requiring modal close/reopen
  * Removed incorrect verified badges by implementing proper database verification checks
  * Updated AuthContext to read actual user profile data from database instead of defaults
  * Fixed rating display across all components to show true database values
  * Enhanced Firestore listeners with metadata changes for immediate UI updates
  * Ensured all components use authentic database data rather than fallback values
- June 28, 2025. Real-time chat messaging system completely fixed:
  * Resolved Firebase composite index error by simplifying message queries
  * Implemented proper server timestamp handling for consistent message ordering
  * Added client-side message sorting to maintain chronological order
  * Messages now appear instantly in real-time without modal refresh required
  * Enhanced error handling and debugging for Firebase listeners
- June 28, 2025. Enhanced user rating and verification system:
  * Added dynamic star rating display based on user ratings (1-5 stars)
  * Implemented verification badges next to user names in profile and exchange cards
  * Added warning indicators for users with negative ratings
  * Star ratings scale appropriately: 0-1=1 star, 1-2=2 stars, etc. up to 5 stars
  * Negative ratings show warning triangle instead of stars
  * Updated both ProfileModal and ExchangeCard components with new rating system
- June 28, 2025. Migration to Replit environment and exchange completion fixes:
  * Successfully migrated project from Replit Agent to standard Replit environment
  * Fixed Complete Exchange functionality in both Dashboard and ChatModal components
  * Resolved Firebase document update errors by implementing proper error handling
  * Enhanced Complete Exchange button styling with gradient design for better visibility
  * Fixed automatic modal closure issue in ChatModal - users can now properly rate and complete exchanges
  * Added proper loading states and dialog descriptions to fix accessibility warnings
  * Improved exchange completion flow with notes support and comprehensive data persistence
  * Fixed event propagation issues preventing rating stars and comment field interactions
  * Enhanced post deletion process to properly remove completed exchange posts
  * Updated exchange history data structure with participants array for better querying
  * Added comprehensive logging for debugging exchange completion process
  * Standardized exchange completion logic across Dashboard and Chat modal components
  * Implemented smart rating multiplier system with diminishing returns for established users
  * Fixed active exchange removal to properly update status and hide completed chats
  * Enhanced rating calculation with weighted impact based on user's total ratings count
  * Rating system prevents inflation by reducing impact weight as users gain more ratings
- June 28, 2025. Two-way rating system and active exchange removal fixes:
  * Implemented mutual rating system - both users can now complete and rate each other
  * Fixed Complete button to appear for both users, not just exchange initiator
  * Enhanced exchange history to create records for both participants
  * Active exchanges now properly removed from UI after completion (deleteDoc instead of status update)
  * Complete button styling now matches dashboard design (gradient green styling)
  * Exchange history displays partner ratings and notes for comprehensive feedback
  * Fixed Firebase import issues and proper timestamp handling for exchange completion
  * Both users see exchange records in their history with proper partner information
- June 28, 2025. Safe Meetup modal enhancements and location permission system:
  * Fixed white filter button visibility with proper gradient styling and backgrounds
  * Added smart location filtering with adjustable distance controls (5km, 10km, 15km, 20km, 50km)
  * Created comprehensive LocationPermissionPage with safety explanations and privacy details
  * Enhanced location detection with automatic permission handling and denial states
  * Added current location display with coordinates and refresh functionality
  * Implemented Refresh Location button with loading states and error handling
  * Added distance filter controls and improved location type filtering UI
  * Enhanced no-location and no-results states with actionable suggestions
  * Fixed Try Again button styling on location permission page for proper visibility
- June 28, 2025. SweetAlert2 modal fixes and persistent exchange map implementation:
  * Enhanced SweetAlert2 z-index to maximum priority (999999+) ensuring buttons are always clickable
  * Modified Report modal to close when clicking outside and removed X button (only Cancel remains)
  * Implemented persistent Exchange Map feature that always displays at top of Nearby Exchanges section
  * Added comprehensive map with distance controls (5km-50km), legend, and zoom/center controls
  * Fixed Leaflet map initialization errors with proper null checks and error handling
  * Map now shows user location and nearby exchange posts with interactive markers
  * Enhanced modal management system to prevent interference between modals
- June 29, 2025. Migration to Replit environment and custom branding implementation:
  * Successfully migrated project from Replit Agent to standard Replit environment
  * Updated all Kolekta logos throughout app with custom logo from user-provided image
  * Replaced favicon, app icons, and header logos in LandingPage, Dashboard, and AuthModal
  * Added custom cash and coin icons throughout the system for better visual representation
  * Updated ExchangeCard, MapView markers, CreatePostModal, FindExchangeModal with new cash/coin icons
  * Enhanced map legend with visual cash-to-coin flow indicators using new icons
  * Created proper PWA manifest with custom branding for mobile installation
  * All branding now consistent across the entire application
  * Added dynamic icon changes in Create Exchange Post modal - icons update based on selected type (bills/coins)
  * Updated peso sign (₱) in Create Exchange Post title replacing dollar sign
  * Integrated Kolekta logo in all map markers and legends for consistent branding
  * Enhanced map markers to display Kolekta logo alongside exchange amounts for better brand recognition
  * Made Location Permission page mobile-responsive and compact for better UX
  * Added platform detection (browser vs app) with appropriate location service instructions
  * Streamlined location permission UI with reduced modal size and clearer instructions
- June 30, 2025. Migration completion and critical fixes:
  * Successfully completed migration from Replit Agent to standard Replit environment
  * Fixed signup checkbox validation - checkbox now properly connects to form state with watch() and setValue()
  * Made checkbox label clickable for better user experience
  * Restored blue color theme throughout the application replacing purple/magenta colors
  * Implemented comprehensive mobile responsiveness fixes for all components
  * Added mobile-specific CSS rules for compact layouts, smaller buttons, and proper spacing
  * Made AuthModal fully mobile-responsive with proper sizing and padding
  * Fixed Dashboard component layout for mobile devices with flexible layouts
  * Added responsive breakpoints for all text sizes, buttons, and cards
  * Ensured all modals and dialogs fit properly on mobile screens
  * Enhanced mobile user experience with touch-friendly interface elements
- June 30, 2025. Critical mobile responsiveness and UI fixes:
  * Fixed StarRating component to display horizontally with proper rating values and colored star icons
  * Made CreatePostModal compact for mobile - reduced width, spacing, and font sizes to eliminate horizontal scrolling
  * Fixed MyPostsModal with proper scrolling container for 5+ items display without overflow
  * Completely rebuilt SafeMeetupModal for mobile compatibility with proper scrolling and compact design
  * All modals now use 90vw width with max-width constraints and proper height management
  * Eliminated horizontal scrolling issues on mobile devices across all modal components
  * Enhanced star rating display with proper database values, centered alignment, and yellow star colors
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```