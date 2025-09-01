# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern TypeScript monorepo built with Better-T-Stack, combining Next.js web app, React Native/Expo mobile app, and Convex backend-as-a-service. The project uses Clerk for authentication and supports both web and mobile platforms with shared backend logic.

## Package Manager and Workspace Structure

**Use `bun` as the package manager** - this is a monorepo with workspace dependencies. Never use npm directly; always use bun commands.

**Monorepo Structure:**
- `apps/web/` - Next.js web application
- `apps/native/` - React Native/Expo mobile application  
- `packages/backend/` - Convex backend functions and schema

Dependencies use workspace references (`workspace:*`), so use bun for installation and management.

## Essential Commands

### Development
- `bun dev` - Start all applications (web, native, backend) concurrently
- `bun dev:web` - Start only the web application (port 3001)
- `bun dev:native` - Start only the React Native/Expo development server
- `bun dev:server` - Start only the Convex backend
- `bun dev:setup` - Initial Convex project setup and configuration

### Code Quality
- `bun check` - Run Biome formatting and linting across all packages
- `bun check-types` - TypeScript type checking across all apps
- `bun build` - Build all applications

### Deployment
- Web: `cd apps/web && bun deploy` - Deploy to Cloudflare using OpenNext

## Architecture and Key Integration Points

### Authentication Flow
- **Web**: Uses `@clerk/nextjs` with middleware at `apps/web/src/middleware.ts`
- **Mobile**: Uses `@clerk/clerk-expo` with token caching via expo-secure-store
- **Backend**: Convex integrates with Clerk via `ConvexProviderWithClerk` and auth config at `packages/backend/convex/auth.config.ts`

The authentication state is shared between web and mobile through Clerk's session management, with Convex receiving the user context automatically.

### State Management Pattern
- **Frontend State**: Uses React hooks and Convex's reactive queries
- **Backend State**: All data operations go through Convex functions (queries, mutations, actions)
- **Real-time**: Convex provides automatic real-time subscriptions to data changes

### Styling System
- **Web**: TailwindCSS with shadcn/ui components
- **Mobile**: NativeWind (TailwindCSS for React Native) with consistent class names
- **Shared Design System**: Both platforms use compatible Tailwind utilities

### Navigation Architecture
- **Web**: Next.js App Router with file-based routing
- **Mobile**: Expo Router with Stack and Drawer navigation
  - Auth screens: `app/(auth)/` - unauthenticated routes
  - Main app: `app/(drawer)/` - authenticated routes with drawer navigation
  - Tabs: `app/(drawer)/(tabs)/` - tabbed interface within drawer

## Important Configuration Files

### Environment Variables
- `apps/web/.env.local` - Next.js environment variables
- `apps/native/.env` - Expo environment variables  
- `packages/backend/.env.local` - Convex environment variables

Required environment variables:
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `EXPO_PUBLIC_CONVEX_URL` - Convex backend URL

### Code Quality (Ultracite/Biome)
The project uses Ultracite rules (`.cursor/rules/ultracite.mdc`) which extends Biome with strict TypeScript, React, accessibility, and Next.js specific rules. Key points:
- No TypeScript enums - use const objects or unions
- Use `export type` and `import type` for types
- Strict accessibility rules for React components
- No `any` types - use proper TypeScript typing
- Arrow functions preferred over function expressions

## Development Workflow

### Starting Development
1. `bun install` - Install all dependencies
2. `bun dev:setup` - Configure Convex (first time only)
3. `bun dev` - Start all development servers

### Adding Dependencies
- Root level: `bun add <package>` 
- Specific app: `bun add <package> --filter=<app-name>`
- Example: `bun add expo-auth-session --filter=native`

### Database Schema Changes
1. Edit `packages/backend/convex/schema.ts`
2. Convex will automatically generate types in `_generated/`
3. Types are imported as `api` in frontend applications

### Authentication Implementation Notes
- Mobile OAuth requires `expo-auth-session` for redirect handling
- Use `useOAuth()` hook from `@clerk/clerk-expo` for social login
- Google OAuth button implemented at `apps/native/components/google-oauth-button.tsx`
- Sign-in flow uses both email/password and OAuth options

## Testing and Quality Assurance

Always run these commands before committing:
1. `bun check-types` - Ensure TypeScript compilation
2. `bun check` - Biome linting and formatting
3. Test both web and mobile apps with `bun dev`

The project enforces strict code quality through Ultracite rules - follow the linting suggestions as they align with modern TypeScript and React best practices.