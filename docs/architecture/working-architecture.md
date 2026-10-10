# Working Architecture

This project now follows a layered architecture that matches the working system design while preserving the current Next.js implementation as the source of truth.

## Layer model

### 1) Frontend
- Client-facing experience
- UI components and state
- Route rendering and interactions
- Source-of-truth implementation: `src/frontend`, `src/app`

### 2) Backend / API Gateway
- Application API routes and request handling
- Auth, security, validation, orchestration
- Source-of-truth implementation: `src/app/api`, `src/backend`

### 3) Shared
- Cross-layer types, constants, utility logic
- Common contracts used by frontend and backend
- Source-of-truth implementation: `src/shared`

### 4) Data / Persistence
- Database schema and persistence layer
- Prisma config and runtime access
- Source-of-truth implementation: `prisma/`

## Compatibility note

The application is still implemented as a Next.js app, and Next.js route handlers must remain inside `src/app` for runtime compatibility. This mapped architecture is therefore conceptual and operationally compatible with the current codebase, rather than a full code migration.

## Architecture map

- Frontend UI: `src/frontend/`
- App shell and route handlers: `src/app/`
- Backend logic: `src/backend/`
- Shared contracts: `src/shared/`
- Database schema: `prisma/schema.prisma`
- Environment config: project root `.env`, `.env.example`

## Why this is the working architecture

This structure preserves:
- Next.js routing conventions
- Route handlers under `app/api`
- Prisma integration
- Existing build and runtime behavior
- No app rewrite or removal of functionality
