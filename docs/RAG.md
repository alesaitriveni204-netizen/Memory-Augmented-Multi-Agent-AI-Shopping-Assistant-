# RAG Pipeline

This project now includes a lightweight retrieval layer built around the existing Prisma-based product catalog and user memory system.

## Architecture

The pipeline keeps the existing conceptual separation:

- Prisma: exact product and memory facts
- Memory Agent: explicit user preferences
- Digital Twin: behavior profile
- RAG: semantic retrieval for product and memory context
- MARE: recommendation scoring
- LLM: grounded final answer generation

## Data sources

The ingestion layer indexes:

- product name, brand, category, specs, tags, pros, cons, price, reviews, platform prices
- user memories with strict per-user filtering
- future shopping-context items when added by the app

## Document transformation

The document builder converts product and memory records into normalized `RagDocument` entries and then splits them into chunks.

## Chunking

Chunking is deterministic and configurable through environment variables:

- `RAG_CHUNK_SIZE`
- `RAG_CHUNK_OVERLAP`

## Embedding layer

The local MVP uses a lightweight deterministic embedding provider to avoid external API requirements. It can be swapped later to OpenAI or another external provider.

## Vector store

The current default is an in-memory vector store for local development. The design is modular and can be replaced by Chroma or pgvector later.

## Retrieval

The API route builds a query, embeds it, searches the indexed product chunks, and returns the strongest results with source metadata.

## Health endpoint

- `GET /api/rag/health`

## Commands

- `npm run rag:ingest`
- `npm run rag:reindex`
- `npm test`

## Known limitations

- This is a local MVP implementation.
- The current vector store is in-memory, not a production vector database.
- The embedding provider is local and deterministic, not remote-hosted.
- RAG is additive; it does not replace Prisma or the recommendation engine.
