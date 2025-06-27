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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```