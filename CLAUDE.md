# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered Customer Support Management System — a single-admin web app where customer emails arrive via webhook, get auto-categorized and auto-responded by an AI agent (Claude/Anthropic) using a PDF knowledge base, and escalated to a human admin when the AI cannot resolve them. The admin reviews, replies, and manages all tickets through a React UI with a metrics dashboard.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for full feature scope and [TECH_STACK.md](TECH_STACK.md) for stack decisions.

---

## Commands

### Backend (`/backend`)

```bash
# Run dev server
./mvnw spring-boot:run

# Build jar
./mvnw clean package

# Run tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=ClassName

# Skip tests during build
./mvnw clean package -DskipTests
```

### Frontend (`/frontend`)

```bash
# Run dev server (fixed on port 5174, strictPort — will not increment)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Preview production build
npm run preview

# Run tests
npm test

# Watch mode
npx vitest
```

---

## Testing

### Backend (`/backend`)

| File | Type | Covers |
|------|------|--------|
| `AuthControllerTest.java` | Unit (Mockito) | Controller logic — login success/failure, logout, me authenticated/unauthenticated |
| `AuthApiTest.java` | Integration (MockMvc) | Full HTTP layer with Spring Security — all auth endpoints + public health |
| `AuthFlowTest.java` | E2E (real HTTP, random port) | Complete login → access → logout → blocked flow |

Run: `./mvnw test -Dtest="AuthControllerTest,AuthApiTest,AuthFlowTest"`

### Frontend (`/frontend`)

Test framework: **Vitest** + **React Testing Library**. Setup file: `src/test/setup.js`.

| File | Type | Covers |
|------|------|--------|
| `AuthContext.test.jsx` | Unit | AuthContext — loading state, /me 401, login/logout state transitions |
| `LoginPage.test.jsx` | Integration | LoginPage component — render, success redirect, error display |
| `AuthFlow.test.jsx` | E2E-style | Full routing — unauthenticated redirect, authenticated home, nav, logout |

All tests mock `fetch` via `vi.stubGlobal`. No real network calls.

---

## Architecture

### Backend — Spring Boot 3.5.3, Java 21

**Package:** `com.customersupport`

All source lives flat in this one package for now. As features grow, expect sub-packages: `controller`, `service`, `repository`, `model`, `config`.

**Key wiring:**
- `CustomerSupportSystemApplication.java` — entry point. Currently excludes `DataSourceAutoConfiguration`, `HibernateJpaAutoConfiguration`, and `PgVectorStoreAutoConfiguration` because PostgreSQL/pgvector are not yet wired into the active development setup. **Remove these exclusions once the DB is integrated.**
- `SecurityConfig.java` — Spring Security filter chain. Only `/api/health` is public; all other routes require authentication. CSRF is disabled (REST API).
- `CorsConfig.java` — reads `app.cors.allowed-origins` from properties and registers a `CorsFilter` for all routes.
- `HealthController.java` — `GET /api/health`, public endpoint, returns `{ status, service, timestamp }`.

**Spring AI setup:**
- Model: `spring-ai-starter-model-anthropic` (Claude) — configured via `spring.ai.anthropic.api-key` and `spring.ai.anthropic.chat.options.*`
- Vector store: `spring-ai-starter-vector-store-pgvector` — requires an `EmbeddingModel` bean. Anthropic does not provide embeddings; an embedding model (e.g. OpenAI) must be added before pgvector can be activated.
- PDF ingestion: `spring-ai-pdf-document-reader` — for parsing uploaded knowledge base PDFs.
- RAG advisor: `spring-ai-advisors-vector-store` — for wiring vector search into chat responses.

**application.properties** keys to know:
- `app.admin.email` / `app.admin.password` — single admin credentials (hardcoded for now, use env vars in prod)
- `app.cors.allowed-origins` — frontend origin (default `http://localhost:5174`)
- `app.pdf.storage-path` — local path for uploaded PDFs

### Frontend — React 19, Vite 8, Tailwind CSS v4

**Tailwind v4** is loaded via the `@tailwindcss/vite` Vite plugin (not PostCSS). The import in `src/index.css` is `@import "tailwindcss"` — not the v3 `@tailwind` directives.

**Installed libraries:** React Router DOM v7, Recharts v3 (for dashboard charts).

**Backend base URL** is hardcoded as `http://localhost:8080` in `App.jsx` — extract to an env var (`import.meta.env.VITE_API_URL`) when adding more API calls.

---

## Development Notes

- The frontend dev server runs on `5173` by default; if that port is taken it increments. The `app.cors.allowed-origins` in `application.properties` must match whichever port Vite lands on.
- pgvector requires the `pgvector` extension enabled in PostgreSQL (`CREATE EXTENSION vector;`) and `spring.ai.vectorstore.pgvector.initialize-schema=true` to auto-create the table.
- Spring AI pgvector needs an `EmbeddingModel` — adding it will require either an OpenAI dependency or another embedding provider, since Anthropic/Claude does not expose an embeddings API.
