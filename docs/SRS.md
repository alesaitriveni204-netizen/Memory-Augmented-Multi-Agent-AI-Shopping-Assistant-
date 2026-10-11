# Software Requirements Specification

## AI Shopping OS — Memory-Augmented Multi-Agent Shopping Assistant

**Document identifier:** AI-SHOP-SRS-001  
**Version:** 1.0  
**Status:** Architecture-derived baseline  
**Date:** 11 October 2026  
**Prepared for:** AI Shopping OS project  
**Specification style:** IEEE 830-1998 SRS organization, adapted to the current Next.js implementation and the architecture diagrams in this repository.

> **Conformance note:** This document specifies the intended product behavior and distinguishes it from the current implementation. A requirement marked **Target** is normative for the production-oriented target described by the architecture but is not claimed to be implemented. The prototype status of RAG is especially important: its current embeddings and vectors are in-memory, and RAG is not integrated into the chat orchestration flow.

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 11 October 2026 | Initial architecture-derived SRS, including current RAG behavior and target requirements. |

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification defines the system boundary, users, interfaces, functional requirements, data requirements, quality requirements, constraints, and acceptance criteria for AI Shopping OS. It is intended for product stakeholders, developers, testers, operators, and reviewers.

The document uses testable “shall” statements. Requirement status labels identify whether a behavior is present in the repository or belongs to the architecture target:

- **Implemented:** evidenced by application code, schema, or project tests at the date of this document. This label does not imply production readiness.
- **Partial:** some behavior exists, but the full specified behavior or quality target is not met.
- **Target:** a desired architecture-derived requirement that must be implemented and verified before claiming conformance.

### 1.2 Scope

AI Shopping OS is a personal shopping-intelligence application, not an online retailer. It helps an authenticated shopper discover and compare catalog products, receive personalized recommendations and explanations, manage a wishlist, and review shopping-related history and insights. The application may use user memories, onboarding preferences, a digital twin, structured catalog data, and retrieval-augmented generation (RAG) to inform its responses.

The system does not accept payment, place orders, or autonomously complete purchases. Product and offer data in the local demo may be seeded or simulated; the current repository does not establish live marketplace integration as a guaranteed capability.

This specification covers:

1. The responsive web application and its single-page, state-driven views.
2. Account access, onboarding, user-scoped data, and personalization controls.
3. Shopping chat, product discovery, comparison, recommendations, memory, digital twin, wishlist, price/history views, notifications, insights, coach, and settings.
4. Server-side APIs, multi-agent orchestration, MARE recommendation scoring, persistence, and external service boundaries.
5. The current RAG prototype and a target RAG architecture that uses persistent indexing, hybrid retrieval, evidence-grounded responses, and measurable operational health.

### 1.3 Intended audience and reading conventions

Readers should first review Sections 2–3 for system context and interfaces, Section 4 for functional requirements, Section 5 for data requirements, and Section 6 for quality requirements. Section 7 records the current RAG implementation separately from target RAG requirements.

“Shall” denotes a mandatory requirement. “Should” denotes a recommendation. Numeric quality targets in this document are proposed acceptance criteria, not measured claims about the current application.

### 1.4 Definitions and acronyms

| Term | Definition |
|---|---|
| AHDE | Adaptive Hybrid Decision Engine; selects the agents and reasoning depth needed for a request. |
| Agent | A server-side specialist function used in the shopping workflow, such as intent, search, memory, price, or explanation. |
| Chunk | A bounded text passage derived from a source document for embedding and retrieval. |
| Digital Twin / DToC | A user-scoped behavioral representation used to personalize shopping assistance. |
| Embedding | A numeric vector representing text for approximate semantic search. |
| Evidence | Retrieved product, catalog, or permitted knowledge content with source identifiers and retrieval metadata. |
| LLM | Large language model used for language understanding or response generation. |
| MARE | Memory-Augmented Recommendation Engine; ranks candidate products using multiple shopping-fit factors. |
| Prisma | ORM used by the application to access its relational database. |
| RAG | Retrieval-augmented generation; retrieves relevant source material and supplies bounded evidence to response generation. |
| Structured retrieval | Exact relational lookup for current attributes such as price, stock, and delivery. |
| Vector store | Storage and search service for embedding vectors, text chunks, and associated metadata. |
| Top-K | Maximum number of retrieval results selected for downstream use. |

### 1.5 References

1. IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications* (organizational style reference).
2. Repository overview: [`README.md`](../README.md).
3. Working architecture: [`working-architecture.md`](architecture/working-architecture.md).
4. Full project architecture and current RAG status: [`full-project-architecture-with-rag.svg`](architecture/full-project-architecture-with-rag.svg).
5. Target efficient RAG flow: [`efficient-rag-architecture.svg`](architecture/efficient-rag-architecture.svg).
6. Current RAG notes: [`RAG.md`](RAG.md).
7. Data model: [`schema.prisma`](../prisma/schema.prisma).
8. RAG source modules: `src/backend/rag/` and `src/app/api/rag/`.

### 1.6 Overview

Section 2 describes the product context, functions, users, environment, constraints, and assumptions. Section 3 lists external interface requirements. Section 4 defines functional requirements. Section 5 defines data requirements. Section 6 defines non-functional requirements. Section 7 records current RAG status, target requirements, and acceptance tests. Section 8 identifies implementation priorities and release acceptance, Section 9 gives traceability, and Section 10 records open decisions.

## 2. Overall description

### 2.1 Product perspective

AI Shopping OS is a full-stack Next.js application. The repository maps the system into these operational layers:

1. **Presentation:** Next.js and React client UI in `src/app` and `src/frontend`, with state-driven views and responsive navigation.
2. **Application/API boundary:** Next.js App Router route handlers in `src/app/api`; validates requests and accesses server-side services.
3. **Orchestration and business logic:** backend modules in `src/backend`, including agents, conversation context, persona/twin behavior, scoring, and RAG utilities.
4. **Shared contracts:** shared types and utilities in `src/shared`.
5. **Relational persistence:** Prisma with SQLite as the current default runtime database.
6. **External services:** server-side LLM SDK and optional search/voice services. Marketplace and catalog data may be simulated in the demo.
7. **Target semantic retrieval:** an independently operated background indexing pipeline and persistent vector index. This is a target architecture, not the current RAG implementation.

The browser shall not connect directly to an LLM provider, relational database, or vector store. It shall call the application’s server-side APIs.

### 2.2 Product functions

At a high level, the system:

- Authenticates users and provides onboarding and preference management.
- Accepts natural-language shopping requests and follow-up references.
- Classifies user intent and applies AHDE routing to avoid unnecessary work.
- Searches and filters the product catalog and compares platform offers.
- Ranks candidates using MARE factors and returns understandable explanations.
- Stores and retrieves user-scoped memories and updates the digital twin when enabled.
- Supports wishlist operations, product comparison, price/history analysis, timelines, notifications, and insights.
- Offers an RAG query/health API prototype and an offline reindex CLI.
- In the target design, retrieves persistent product/review evidence, merges it with authoritative structured product facts, and grounds generated answers in that evidence.

### 2.3 User classes and characteristics

| User class | Description | Main needs |
|---|---|---|
| Shopper | Primary user, authenticated through the application. May have limited technical knowledge. | Find suitable products, understand trade-offs, control personalization, and manage saved items. |
| New shopper | Authenticated user who has not completed onboarding. | Complete or skip onboarding and establish initial preferences. |
| Returning shopper | User with saved history, memories, and possibly a digital twin. | Receive continuity and relevant personalization, with access limited to their own data. |
| Operator / developer | Maintains the application, database, model configuration, and RAG index. | Start the application, ingest/reindex data, monitor health, and diagnose failures. |
| External provider | LLM, embedding, marketplace, web/image search, or voice service called by the server. | Receive only the necessary request data and return a bounded, validated response. |

### 2.4 Operating environment

**Current implementation environment:** Node.js, Next.js App Router, React, TypeScript, Prisma, and SQLite; browser-based desktop and mobile layouts. The project uses environment variables for database and provider configuration.

**Target deployment environment:** a supported Node.js host capable of running Next.js server routes, a managed relational database at production scale, and a persistent vector store/embedding service if target RAG requirements are enabled. Exact cloud provider and service deployment topology are outside the current repository’s established requirements.

### 2.5 Design and implementation constraints

1. The current application shall continue to run as a Next.js application; Next.js route handlers remain under `src/app/api`.
2. All credentials and external model calls shall remain server-side.
3. Prisma/relational storage is authoritative for transactional and changing product facts, including current prices and availability.
4. Semantic retrieval shall not override structured truth for exact numeric/current attributes.
5. User memory and digital-twin data shall be isolated by authenticated user identity.
6. RAG results shall be treated as untrusted data, not as instructions to the model or the application.
7. No autonomous purchase or payment behavior is within scope.
8. Current product/platform data may be mock or seeded data; the system shall not represent it as live-verified unless a live provider has actually supplied it.
9. The local RAG prototype uses deterministic in-process embeddings and in-memory vectors. Persistent indexing and the chat-grounded RAG flow are target work.

### 2.6 Assumptions and dependencies

- Users have a modern browser and network access to the application.
- The database schema is applied and the configured database is readable/writable.
- RAG is enabled by default in the current configuration unless disabled by environment configuration.
- The current default embedding provider is the local deterministic memory provider. Selecting an unsupported remote embedding provider must be treated as a configuration error.
- LLM-dependent operations rely on server configuration and provider availability; fallback behavior may exist, but must not fabricate successful external completion.
- Local seeded/mock product data is available for demonstration and tests.
- Target persistent RAG depends on selecting, provisioning, securing, and backing up a vector-store implementation and compatible embedding model. Those products are not selected by this SRS.

## 3. External interface requirements

### 3.1 User interfaces

1. **UI-001:** The application shall provide responsive desktop and mobile layouts, including appropriate primary navigation for the available viewport.
2. **UI-002:** The interface shall provide the supported shopping views: Home, Chat, Discover, Compare, Wishlist, Digital Twin, Coach, Sales, Insights, and Settings; supporting history, memory, timeline, notification, and onboarding flows shall be available where implemented.
3. **UI-003:** The interface shall expose loading, empty, validation, success, and error states for asynchronous operations.
4. **UI-004:** The theme setting shall apply consistently to text, surfaces, forms, navigation, dialogs, and overlays.
5. **UI-005:** Product and recommendation cards shall make relevant product identity, price source, stock/delivery status, recommendation explanation, and available actions distinguishable.
6. **UI-006:** Retrieved evidence and recommendations shall be presented as assistance, not as a guaranteed offer or purchase commitment.
7. **UI-007:** Controls shall be keyboard operable and have accessible names; focus indication shall remain visible.

### 3.2 Hardware interfaces

No direct hardware interface is required. Optional voice input may use a device microphone through browser APIs and the application’s server endpoint, subject to user permission.

### 3.3 Software interfaces

| Interface | Purpose | Requirement |
|---|---|---|
| Prisma / relational database | User, catalog, offer, memory, chat, recommendation, wishlist, event, and notification persistence. | The application shall use the configured database URL and handle unavailable storage as an explicit service error. |
| LLM SDK | Server-side intent or response generation where configured. | Requests shall be bounded, validated, and isolated from browser credentials. |
| Embedding provider | Converts chunks and queries to compatible vectors. | Indexing and queries shall use the same embedding model/version and vector dimensions. |
| Vector store (target) | Persistent vector/chunk storage and similarity retrieval. | Must support stable record identity, metadata filters, updates/deletes, and health/count operations. |
| Marketplace/catalog providers | Optional product/offers information. | External results shall be normalized and identified by source and retrieval time. |
| Web/image search and ASR | Optional search or voice assistance. | Failures shall be observable; no provider result may be represented as verified when unavailable. |

### 3.4 Communications interfaces

1. The browser shall communicate with the application over HTTPS in deployed environments and same-origin HTTP during local development.
2. JSON APIs shall use UTF-8 JSON request and response bodies.
3. Authenticated API calls shall use the application’s session mechanism; authorization decisions shall be performed server-side.
4. External provider traffic shall use encrypted transport where supported.
5. API responses shall communicate failure through suitable HTTP status codes and a structured error body; a failure shall not be shaped as a successful answer.

### 3.5 Current API surface

The current repository includes route families for authentication, initialization, onboarding, chat/history/sessions, products/discovery/price refresh, recommendations, price comparison/verdict, bundles, memory, digital twin/analysis/evolution, wishlist, timeline, insights, notifications, coach tips, export, web search, image search, ASR, and RAG query/health. Exact route contracts are defined by the corresponding handlers and are not duplicated in this SRS.

## 4. System features and functional requirements

Status shown per requirement reflects repository evidence on the document date. Requirements marked Target define conformance needed for the architecture target.

### 4.1 Account access, onboarding, and preferences

| ID | Requirement | Status |
|---|---|---|
| FR-ACC-001 | The system shall authenticate a shopper before returning that shopper’s private memories, chat history, wishlist, notifications, or digital-twin data. | Implemented in core session helpers; verify every route consistently. |
| FR-ACC-002 | The system shall associate each user-owned record with the authenticated user and reject cross-user reads or writes. | Partial; schema supports user relations, route-by-route verification remains necessary. |
| FR-ACC-003 | The system shall allow a user to complete onboarding or use the documented skip path where available. | Implemented. |
| FR-ACC-004 | The system shall persist onboarding preferences and provide settings to enable or disable memory/personalization where supported. | Implemented/Partial. |
| FR-ACC-005 | The system shall provide account creation, sign-in, session revocation, and password reset flows through the application APIs. | Implemented; provider/deployment configuration dependent. |

### 4.2 Shopping request and orchestration

| ID | Requirement | Status |
|---|---|---|
| FR-CHAT-001 | The system shall accept a non-empty natural-language shopping request and return a validation error for a missing or malformed request. | Implemented. |
| FR-CHAT-002 | The system shall associate a request with an authenticated user and a conversation session. | Implemented. |
| FR-CHAT-003 | The system shall resolve supported follow-up references using the user’s conversation context before intent handling. | Implemented. |
| FR-CHAT-004 | The system shall classify intent and extract relevant category, product type, budget, brand, use case, attributes, missing constraints, and complexity when available. | Implemented with model and heuristic paths. |
| FR-CHAT-005 | The AHDE shall select a request-appropriate subset of agents and avoid invoking agents that are not needed for the recognized intent. | Implemented; exact route execution must match the plan. |
| FR-CHAT-006 | The system shall execute the applicable catalog search, memory, digital twin, recommendation, budget, price, and explanation operations for the request. | Implemented in part; see RAG separation in Section 7. |
| FR-CHAT-007 | The system shall persist user and assistant chat messages, applicable recommendation records, and a timeline event after successful processing. | Implemented. |
| FR-CHAT-008 | Background memory/twin updates shall not delay the primary answer and shall log failures for diagnosis. | Implemented. |
| FR-CHAT-009 | The system shall return a structured response containing the assistant text and, when available, recommendations, intent, plan, latency, session, and message identifiers. | Implemented. |
| FR-CHAT-010 | If orchestration or a required dependency fails, the system shall return an explicit error and shall not report an unsupported successful recommendation. | Partial; verify all agent fallback paths. |

### 4.3 Catalog discovery, comparison, and recommendation

| ID | Requirement | Status |
|---|---|---|
| FR-CAT-001 | The system shall retrieve product candidates from the configured catalog using supported category, brand, budget, and other explicit constraints. | Implemented/Partial; confirm each filter is honored by each route. |
| FR-CAT-002 | The system shall present product details and platform offers with source-associated price, discount, stock, delivery, and seller data when those fields exist. | Implemented for catalog records. |
| FR-CAT-003 | The system shall support comparing candidate products or platform offers and explain the basis for a comparison. | Implemented. |
| FR-CAT-004 | The MARE component shall produce a shopping score and factor breakdown for eligible recommendation candidates. | Implemented. |
| FR-CAT-005 | The system shall provide a human-readable explanation for recommended products that is consistent with the score and available product data. | Implemented/Partial; requires factual and relevance evaluation. |
| FR-CAT-006 | The system shall not describe seeded or mock platform data as live marketplace data. | Target; enforce through source labeling and UI copy. |
| FR-CAT-007 | Exact or time-sensitive price, stock, and delivery claims shall be read from authoritative structured records/providers and shall not be inferred from vector similarity. | Target; architecture requirement. |

### 4.4 Memory and digital twin

| ID | Requirement | Status |
|---|---|---|
| FR-MEM-001 | The system shall store memories with a user ID, type, category, key, value, confidence, weight, source, and timestamps. | Implemented in schema. |
| FR-MEM-002 | The system shall retrieve only the authenticated user’s memories when personalizing a request. | Implemented in core retrieval paths; verify route coverage. |
| FR-MEM-003 | The system shall allow supported memory review, editing, deletion, export, and enable/disable actions. | Implemented/Partial by view and API. |
| FR-TWIN-001 | The system shall initialize or load a user-scoped digital twin from onboarding and interaction data. | Implemented. |
| FR-TWIN-002 | The system shall display the twin’s persona, confidence, traits, preferences, and evolution where data is available. | Implemented. |
| FR-TWIN-003 | The system shall respect user personalization controls and shall not use disabled personalization as a recommendation input. | Target; require end-to-end verification. |

### 4.5 Wishlist, events, notifications, insights, and settings

| ID | Requirement | Status |
|---|---|---|
| FR-LIST-001 | The system shall allow users to add, view, update, and remove their own wishlist items, including an optional target price and notes. | Implemented. |
| FR-LIST-002 | The system shall maintain user-scoped shopping timeline events for supported actions. | Implemented. |
| FR-NOT-001 | The system shall display user-scoped notifications and support marking notifications read. | Implemented. |
| FR-INS-001 | The system shall present supported shopping insights and price-history information from available persisted data. | Implemented/Partial; depends on data coverage. |
| FR-SET-001 | The system shall expose applicable personalization, theme, and application settings without modifying unrelated user data. | Implemented/Partial. |
| FR-PUR-001 | The system shall not place an order, submit payment, or complete a purchase without a separately authorized and confirmed feature. | Implemented by product scope; purchase automation is out of scope. |

### 4.6 Current RAG query and indexing behavior

| ID | Requirement | Status |
|---|---|---|
| FR-RAG-001 | The system shall expose a health endpoint that reports whether RAG is enabled and the configured vector provider. | Implemented. |
| FR-RAG-002 | The RAG query endpoint shall validate the query payload, authenticate the caller, retrieve product records, chunk and embed product documents, search the vector store, and return an answer plus source/snippet metadata. | Implemented as a prototype in `src/app/api/rag/query/route.ts`. |
| FR-RAG-003 | The indexing CLI shall load product and memory records, build documents, chunk content, embed chunks, upsert them into its configured vector store, and report counts. | Implemented, but storage is process-local and is not retained after command exit. |
| FR-RAG-004 | The system shall retain indexed vectors across process restarts and make offline ingestion results available to online queries. | Target; not met by the in-memory store. |
| FR-RAG-005 | The system shall use a stable, compatible embedding model and vector dimension for both document indexing and query embedding. | Target; current model is a deterministic hash/token prototype. |
| FR-RAG-006 | The system shall apply authenticated-user filters to private memory retrieval and shall not expose one user’s memory to another. | Target for RAG; current RAG query path indexes/searches products only. |
| FR-RAG-007 | The system shall report accurate document/chunk counts, provider status, index version, and last successful index time in health/operations responses. | Target; current health route hard-codes `indexedChunks` to zero. |
| FR-RAG-008 | The system shall return provenance for each retrieved result, including source type, product/document ID, chunk/document type, and relevance score. | Partial; current query provides some source and snippet metadata. |
| FR-RAG-009 | The system shall support incremental upsert and deletion of changed or removed source records without duplicating stale chunks. | Target; current CLI rebuilds an ephemeral in-memory store. |

## 5. Data requirements

### 5.1 Logical data entities

The current relational schema defines entities for users, authentication sessions, password-reset tokens, memories, products, platform prices, price history, chat messages, recommendations, wishlist items, timeline events, notifications, and connected accounts. Target RAG adds a persistent index containing chunks and embeddings without replacing relational product truth.

### 5.2 Data ownership and authority

1. Relational records are authoritative for user accounts, current product catalog values, offer facts, and user activity.
2. A vector index is a derived search aid. It shall be rebuildable from approved source records and shall not become the sole source of current prices or user permissions.
3. Every private memory record and any private index representation shall be associated with a user identifier and filtered using authenticated identity.
4. Product and review documents shall preserve stable source/product identifiers and source metadata.
5. Indexing shall record enough metadata to identify the source and index/model version, and to remove obsolete chunks when a source changes or is deleted.

### 5.3 Data retention, export, and deletion

1. User data shall be retained only as required for the user-facing features and applicable operational obligations.
2. The system shall provide a defined deletion path for user-owned relational data and corresponding private vector records.
3. User export shall include supported user data in a machine-readable format.
4. Retention periods, backup schedules, and legal deletion rules require product-owner confirmation before production deployment; this SRS does not invent jurisdiction-specific periods.

### 5.4 Data quality

The system shall validate incoming API payloads, normalize source records before indexing, handle malformed optional JSON fields without crashing document creation, and distinguish unknown/missing facts from verified values. Price, stock, and delivery data shall include a source or freshness indicator before being presented as current.

## 6. Non-functional requirements

These are proposed measurable targets for a production-ready release. They are not claimed test results for the current local prototype.

### 6.1 Performance

| ID | Requirement | Acceptance measure |
|---|---|---|
| NFR-PERF-001 | For catalog queries served from the configured local/production database under normal load, the API shall return a response within 2 seconds at the 95th percentile, excluding external model generation. | Load test with 50 concurrent sessions and representative seeded catalog. |
| NFR-PERF-002 | A RAG query using an already-built persistent index shall complete retrieval within 1 second at the 95th percentile, excluding LLM generation. | 1,000 representative indexed chunks, 50 concurrent queries, measured p95. |
| NFR-PERF-003 | The online request path shall not rebuild and re-embed the entire catalog on each user query. | Verify no catalog-wide embedding/index operation occurs in query traces. |
| NFR-PERF-004 | The online request shall enforce a configurable Top-K and context token ceiling. | Automated tests verify result count and assembled context do not exceed configured limits. |

### 6.2 Security and privacy

| ID | Requirement | Acceptance measure |
|---|---|---|
| NFR-SEC-001 | The system shall authenticate and authorize all private data operations server-side. | Negative tests for missing, expired, and foreign-user sessions. |
| NFR-SEC-002 | The system shall scope memories, conversations, recommendations, wishlist items, and private vector records to the authenticated user. | Cross-user isolation tests cover reads, writes, retrieval, and deletion. |
| NFR-SEC-003 | Secrets and provider credentials shall be stored outside source code and never returned to the browser. | Configuration scan and response inspection. |
| NFR-SEC-004 | The system shall validate and size-limit user input and provider output before processing or persistence. | Boundary tests include malformed JSON, oversized input, and invalid provider output. |
| NFR-SEC-005 | Retrieved text shall be treated as untrusted content and shall never be allowed to override system instructions or authorization policy. | Adversarial retrieval tests. |
| NFR-SEC-006 | The system shall avoid logging passwords, tokens, raw credentials, or unnecessary private memory values. | Log inspection with sensitive test fixtures. |

### 6.3 Reliability and availability

| ID | Requirement | Acceptance measure |
|---|---|---|
| NFR-REL-001 | A database, embedding, vector-store, or LLM failure shall produce an explicit, diagnosable failure or a documented safe degraded response. | Fault-injection tests per dependency. |
| NFR-REL-002 | Failure in optional RAG retrieval shall not alter authoritative structured facts or leak another user’s data. | Dependency outage and isolation tests. |
| NFR-REL-003 | A successful index update shall be atomic or recoverable so partial ingestion cannot silently replace a healthy index. | Simulate interruption during reindex; verify rollback or recoverable version. |
| NFR-REL-004 | The production service target shall be at least 99.5% monthly availability, excluding announced maintenance and external provider outages. | Production monitoring over a calendar month; target pending operational sign-off. |

### 6.4 Usability and accessibility

1. **NFR-USE-001:** The primary shopping workflows shall be operable using keyboard navigation and visible focus states.
2. **NFR-USE-002:** At supported viewport widths from 360 CSS pixels upward, core navigation and primary content shall remain usable without page-level horizontal overflow.
3. **NFR-USE-003:** Essential text and controls shall meet WCAG 2.2 AA contrast requirements, excluding decorative content.
4. **NFR-USE-004:** Loading and error feedback shall identify the affected action and, where safe, provide a recovery action.
5. **NFR-USE-005:** Recommendation explanations and RAG evidence indicators shall be understandable to a non-technical shopper.

### 6.5 Maintainability, portability, and observability

1. **NFR-MNT-001:** RAG embedding and vector-store implementations shall be replaceable behind typed interfaces without rewriting UI or business scoring logic.
2. **NFR-MNT-002:** Automated tests shall cover document construction, chunking, embedding contract, filtering, ranking, source attribution, and failure behavior.
3. **NFR-MNT-003:** Operational logs shall include request/index correlation IDs, stage duration, result counts, and sanitized error information.
4. **NFR-MNT-004:** Operators shall be able to identify the active embedding model/version, vector-store provider, index version, chunk count, last successful index time, and indexing error state.
5. **NFR-PORT-001:** The application shall remain buildable and runnable using documented Node.js/npm commands and environment configuration.
6. **NFR-PORT-002:** The relational database may be migrated from SQLite to a production database without changing public API semantics.

## 7. RAG requirements and implementation baseline

### 7.1 Architecture intent

The target RAG path is:

1. The shopper submits a request through the UI.
2. A server-side API authenticates the user, validates the request, applies request limits, and routes intent.
3. AHDE decides whether semantic retrieval is useful.
4. Structured retrieval obtains exact current catalog facts from Prisma.
5. Semantic retrieval queries a persistent vector index with metadata filters and returns a bounded set of chunks, identifiers, and scores.
6. The system merges/deduplicates candidates, enforces hard user constraints, and uses MARE for personalized ranking.
7. The response generator receives only bounded, relevant evidence and explains supported results with product/source identifiers.
8. The application persists chat/recommendation activity as appropriate.
9. A separate offline/background ingestion process normalizes approved sources, detects changes, chunks and embeds only changed content where possible, and upserts/deletes persistent index entries.
10. Operations tooling reports health, counts, latency, relevance signals, and reindex status.

Prisma owns live structured truth; RAG finds relevant language evidence; MARE decides product fit; response generation communicates supported results. RAG is not a substitute for authorization, exact database filters, or deterministic business rules.

### 7.2 Current implementation observed

| Area | Current behavior | Conformance assessment |
|---|---|---|
| Source documents | Product documents include overview, specs, and pros/cons. Memory documents can also be built. | Present. Product text may include prices and platform offers, but these are snapshots and must not replace live price lookup. |
| Chunking | Deterministic character-based chunks, default size 700 and overlap 100, configurable through environment variables. | Present; no semantic-boundary or content-hash incremental indexing. |
| Embeddings | Local deterministic 256-dimensional token/hash vectors with boosted domain terms. Unsupported `openai`/`gemini` selections throw. | Prototype, not a semantic embedding model. |
| Vector store | In-memory vector store implementing upsert/search/delete/count. | Functional only within the process; not persistent. |
| CLI | `npm run rag:ingest` / `npm run rag:reindex` queries product and memory records, builds chunks and vectors, and prints counts. | Runs after fixing the Prisma import; the resulting store is discarded when the process exits. |
| Query API | Authenticated POST handler builds product documents for up to 20 catalog products, embeds the chunks/query, searches an in-memory store, and returns an answer, source snippets, and metadata. | Prototype. Rebuilds embeddings per request; query route does not retrieve user memories or integrate with the chat agent flow. |
| Chat orchestration | Chat route uses intent, AHDE, memory, search, MARE, price, budget, and explainability agents. | RAG is not called by the chat route. |
| Health API | Reports enabled state and configured vector-provider string. | Partial; `indexedChunks` is hard-coded to zero and is not an operational index measurement. |
| Provider configuration | Configuration includes `memory` and `chroma` names; embedding configuration defaults to `memory`. | Chroma is not evidence of an implemented persistent Chroma adapter. |
| Quality evidence | Unit tests cover product document creation, chunking, an in-memory search, and query normalization. | Basic tests pass; retrieval relevance, persistence, auth isolation, API integration, and failure behavior need further tests. |

### 7.3 Target RAG functional requirements

1. **RAG-T-001 — Ingestion sources:** The indexing process shall accept only approved catalog and knowledge sources and record the provenance of each source.
2. **RAG-T-002 — Stable identity:** Each indexed document and chunk shall have a stable source ID, document ID, chunk ID, content hash, and index/model version.
3. **RAG-T-003 — Incremental indexing:** The indexer shall upsert new or changed chunks and delete stale chunks when source content is changed or removed.
4. **RAG-T-004 — Persistent storage:** Completed indexing shall survive CLI exit, application restart, and deployment restart.
5. **RAG-T-005 — Compatible vectors:** Query vectors shall use the same versioned model and dimensions as indexed vectors; incompatible index/model versions shall be rejected or explicitly migrated.
6. **RAG-T-006 — Query routing:** AHDE shall invoke semantic retrieval only for intents that can benefit from descriptive product/review evidence. Pure greetings and exact current-price questions shall not depend on RAG.
7. **RAG-T-007 — Hybrid retrieval:** When applicable, the system shall combine semantic evidence with structured catalog results. Structured data shall be authoritative for current numeric attributes.
8. **RAG-T-008 — Query constraints:** Explicit brand, category, budget, availability, and user-scope constraints shall be applied as deterministic filters, not left solely to vector similarity.
9. **RAG-T-009 — Evidence filtering:** The system shall enforce configured Top-K, minimum relevance threshold, and context-token budget before passing evidence to an LLM.
10. **RAG-T-010 — Deduplication:** Results shall be deduplicated by canonical product/document identity while retaining relevant source provenance.
11. **RAG-T-011 — Grounded response:** The generator shall answer only from the user request, authorized memory, authoritative structured facts, and selected retrieved evidence; it shall not invent citations, prices, stock, or specifications.
12. **RAG-T-012 — Citation/provenance:** Each RAG-supported product claim shall be traceable to a product/source/document identifier and retrieval result.
13. **RAG-T-013 — User memory:** If private memory is included in target RAG, it shall be stored/query-filtered by authenticated user, excluded from shared product indexes by default, and omitted when memory or personalization is disabled.
14. **RAG-T-014 — Untrusted text:** Retrieved text shall be clearly separated from instructions and treated as untrusted data during generation.
15. **RAG-T-015 — Safe fallback:** If the index or embedding provider is unavailable, the system shall either continue using valid structured results with an explicit reduced-evidence indication or return an explicit error according to the request type.
16. **RAG-T-016 — Health:** The health API shall report actual provider readiness, index identity/version, indexed document/chunk counts, last successful index time, and actionable failure state without exposing secrets.
17. **RAG-T-017 — Evaluation:** The project shall maintain a representative, versioned retrieval evaluation set and measure precision@K/recall@K or a stakeholder-approved equivalent before changing embedding, chunking, ranking, or metadata-filter behavior.

### 7.4 RAG quality and acceptance tests

Target RAG shall not be declared production-ready until all of the following pass:

- **Persistence:** Index a known catalog, terminate the indexer and app, restart the app, and retrieve the same indexed source without rebuilding the catalog on the request path.
- **Relevance:** On an agreed evaluation set of at least 100 query/product judgments, achieve precision@5 of at least 0.80 and recall@10 of at least 0.85, or obtain written product-owner approval of alternative thresholds.
- **Constraint correctness:** In 100% of deterministic filter tests, explicit brand/category/budget/user filters shall exclude violating items even when their semantic similarity is high.
- **Factual integrity:** In 100% of tests with a changed or unknown price/stock value, response generation shall use current structured data or state that the fact is unavailable; it shall not cite stale chunk text as current truth.
- **Isolation:** Cross-user memory query tests shall return zero foreign-user memory records.
- **Prompt-injection resistance:** Malicious instructions inside indexed source text shall not change system behavior, permissions, or response policy.
- **Bounded context:** Tests shall prove Top-K and configured context token limits are honored.
- **Health correctness:** The reported chunk/document count shall match the index’s count API after successful indexing and deletion.
- **Failure recovery:** Interrupted ingestion and unavailable vector/embedding services shall produce a visible error and preserve or recover the last known-good index.

### 7.5 RAG implementation roadmap

The following staged plan follows the architecture diagrams and does not imply that these changes have already been made:

1. **Foundation:** Select a persistent vector store and production embedding model; define versioned configuration and secrets management.
2. **Indexing:** Add stable content hashes, incremental upsert/delete, index versioning, idempotency, batching, retry policy, and rollback or atomic swap.
3. **Query path:** Add persistent retrieval, deterministic filters, thresholding, deduplication, evidence budgets, and provenance.
4. **Chat integration:** Route eligible chat intents through RAG and hybrid candidate fusion; keep structured live facts authoritative.
5. **Privacy and safety:** Add user-isolation tests, data deletion propagation, prompt-injection defenses, and sanitized observability.
6. **Evaluation and operations:** Add retrieval quality fixtures, health metrics, index status, and operational runbooks.

## 8. Priorities and release acceptance

### 8.1 Priority classification

- **P0:** Correct authentication and authorization, user isolation, exact structured facts, valid API behavior, core shopping workflows, reliable local startup.
- **P1:** Persistent RAG index, grounded chat integration, evidence provenance, accurate health reporting, retrieval evaluation, incremental reindex.
- **P2:** Production-scale external marketplace ingestion, advanced ranking optimization, model-provider alternatives, extended operational analytics.

### 8.2 Release acceptance

A release conforms to the baseline when:

1. The application builds and starts using documented commands and configured dependencies.
2. Core authentication, onboarding, chat/search, comparison, recommendation, wishlist, and user-data isolation tests pass.
3. Requests with invalid input and unavailable required dependencies produce explicit errors.
4. Mobile and desktop critical workflows remain usable and accessible.
5. The release notes state whether product/offer information is seeded, mocked, or live.
6. A release claiming **RAG prototype** passes current RAG unit tests and clearly discloses in-memory/non-persistent operation.
7. A release claiming **production-ready RAG** additionally passes all target requirements and tests in Sections 6.1, 6.2, 7.3, and 7.4.

## 9. Traceability

| Architecture/source | Related requirements |
|---|---|
| Next.js/React frontend and responsive app views | UI-001–UI-007; FR-ACC-003–004; FR-CAT-002–003; FR-LIST-001; FR-SET-001 |
| API/auth boundary and server-side model calls | FR-ACC-001–005; FR-CHAT-001–010; NFR-SEC-001–006 |
| Intent → AHDE → specialist agents → MARE/explanation | FR-CHAT-003–006; FR-CAT-004–005 |
| Prisma/SQLite domain data model | FR-MEM-001–003; FR-TWIN-001–003; FR-LIST-001; FR-NOT-001; FR-INS-001; Section 5 |
| Current in-memory RAG modules and APIs | FR-RAG-001–009; Section 7.2 |
| Target hybrid request path in efficient RAG diagram | FR-CAT-007; RAG-T-006–015; NFR-PERF-002–004 |
| Target background indexing and persistent vector store | FR-RAG-004–009; RAG-T-001–005, RAG-T-016–017; Section 7.4 |

## 10. Open decisions

The following decisions require stakeholder approval before production commitment:

1. Which persistent vector store and embedding model/version will be supported?
2. Which marketplace/catalog and review sources are authorized, and what data freshness guarantees can they provide?
3. Will private user memories be indexed in a separate per-user collection, retrieved from relational storage, or excluded from vector search?
4. What retention, export, and deletion policies apply to user and derived vector data?
5. Are the proposed performance, availability, and retrieval-quality targets in this SRS acceptable for the intended deployment?
6. What user-visible behavior is required when RAG is unavailable: structured-only degraded response or request failure?
7. Which canonical product identity and deduplication rules should be used when different providers describe the same item?
