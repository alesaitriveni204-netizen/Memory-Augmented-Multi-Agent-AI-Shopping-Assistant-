# Backend Layer

This directory represents the backend/API layer in the working architecture.

The live implementation remains in `src/backend` and `src/app/api` to preserve the project’s existing Next.js runtime and route-handler conventions.

## Current mapped sources
- API routes: `../src/app/api`
- Backend logic: `../src/backend`
- Prisma access: `../src/backend/db.ts`
- AI orchestration: `../src/backend/agents.ts`, `../src/backend/scoring.ts`
- RAG logic: `../src/backend/rag`
