# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🌐 Language Preference
**重要提示：此项目的维护者主要使用中文交流。请在与用户沟通时优先使用中文回复，除非用户明确要求使用英文。**

**Important Note: The maintainer of this project primarily communicates in Chinese. Please prioritize responding in Chinese when communicating with users, unless they explicitly request English.**

## Project Overview

This is a multi-platform Pomodoro timer application built with modern TypeScript stack. The project consists of:
- **Browser Extension** (Plasmo-based Chrome extension)
- **Web App** (Next.js with Tauri for desktop)
- **Native Mobile App** (React Native with Expo)
- **Server/API** (Hono on Cloudflare Workers with ORPC)

## Workspace Structure

This is a pnpm workspace with Turborepo for build orchestration:
- `apps/browser-extension/` - Plasmo browser extension
- `apps/web/` - Next.js web app with Tauri desktop support
- `apps/native/` - React Native/Expo mobile app
- `apps/server/` - Hono API server on Cloudflare Workers

## Development Commands

### Global Commands (run from root)
- `pnpm install` - Install all dependencies
- `pnpm dev` - Start web, server, and browser extension in parallel
- `pnpm build` - Build all apps
- `pnpm check` - Run Biome formatter/linter
- `pnpm check-types` - Type check all apps
- `pnpm dev:native` - Start React Native/Expo dev server
- `pnpm dev:web` - Start only web app
- `pnpm dev:server` - Start only server

### Database Commands (run from root)
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio UI
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Apply migrations
- `cd apps/server && pnpm db:local` - Start local SQLite database

### App-Specific Commands
**Browser Extension:**
- `cd apps/browser-extension && pnpm dev` - Start Plasmo dev server
- `cd apps/browser-extension && pnpm build` - Build extension
- `cd apps/browser-extension && pnpm package` - Package for distribution

**Web App:**
- `cd apps/web && pnpm dev` - Start Next.js dev server (port 3001)
- `cd apps/web && pnpm desktop:dev` - Start Tauri desktop app
- `cd apps/web && pnpm desktop:build` - Build Tauri desktop app
- `cd apps/web && pnpm lint` - Run Next.js linter

**Server:**
- `cd apps/server && pnpm dev` - Start Wrangler dev server (port 3000)
- `cd apps/server && pnpm deploy` - Deploy to Cloudflare Workers

**Native:**
- `cd apps/native && pnpm dev` - Start Expo dev server
- `cd apps/native && pnpm android` - Run on Android
- `cd apps/native && pnpm ios` - Run on iOS

## Architecture

### Pomodoro Timer System
The core Pomodoro functionality is built around:
- **State Management**: Uses Plasmo Storage for browser extension, local state for other apps
- **Timer Logic**: Background scripts handle timing, foreground UI displays state
- **Phase Types**: `idle | focus | short | long` with configurable durations
- **History Tracking**: Completed sessions stored with queue grouping

Key files:
- `apps/browser-extension/src/pomodoro/types.ts` - Core types and constants
- `apps/browser-extension/src/hooks/usePomodoro.ts` - React hook for timer state
- `apps/browser-extension/src/background/messages/` - Background message handlers

### Authentication
- **Better Auth** for authentication across all platforms
- **Database**: Drizzle ORM with SQLite/Turso
- **Schema**: User, session, account, and verification tables in `apps/server/src/db/schema/auth.ts`

### API Layer
- **oRPC** for end-to-end type safety between client and server
- **Hono** web framework on Cloudflare Workers
- **AI Integration**: Google Generative AI (Gemini) for AI features

### UI Components
- **TailwindCSS** for styling across all platforms
- **Radix UI** components with shadcn/ui patterns
- **Shared Components**: Button, Card, Input, Label, etc. in each app's `components/ui/` directory

## Code Quality

This project uses **Ultracite** (Biome-based) for code formatting and linting with strict TypeScript rules:
- Run `pnpm check` to format and fix issues
- Follows accessibility standards and React best practices
- Enforces strict TypeScript configuration
- See `.cursor/rules/ultracite.mdc` for detailed rules

## Testing

**Note**: No specific test commands found in package.json files. Check with the team about testing setup before writing tests.

## Browser Extension Specifics

- **Plasmo Framework** for extension development
- **Manifest V3** with permissions: alarms, storage, notifications
- **Background Scripts**: Handle timer logic and persistence
- **Content Scripts**: Break overlay functionality
- **Popup/Sidepanel**: Main UI components

## Deployment

- **Server**: Cloudflare Workers via Wrangler
- **Web**: Supports OpenNext.js for Cloudflare deployment
- **Browser Extension**: Package via Plasmo for Chrome Web Store
- **Desktop**: Tauri for native desktop builds
- **Mobile**: Expo for app store deployment

## Environment Setup

1. Install dependencies: `pnpm install`
2. Set up database: `cd apps/server && pnpm db:local` then `pnpm db:push`
3. Start development: `pnpm dev`
4. Access:
   - Web app: http://localhost:3001
   - API server: http://localhost:3000
   - Browser extension: Load in Chrome developer mode

## Important Notes

- This is a monorepo - always run commands from appropriate directory
- Database changes require `pnpm db:push` to apply
- Browser extension needs manual loading in Chrome for development
- AI features require Google API key in server environment