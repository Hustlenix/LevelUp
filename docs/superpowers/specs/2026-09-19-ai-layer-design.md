# LevelUp AI Layer Design

**Status:** Approved for staged implementation on 2026-09-19; local-only Ollama override applied during execution.

## Goal

Add a context-aware AI layer to LevelUp without replacing the existing local-first product or sending user data to a remote AI service.

## Current constraints

- The frontend remains a Next.js static export deployed to GitHub Pages.
- Existing uncommitted Study SEO work and generated data changes are preserved.
- The browser may call only the user's own loopback Ollama endpoint; it must never call a remote AI endpoint or receive an AI credential.
- When Ollama is not installed, not running, or unreachable, the product remains useful through deterministic local recommendations.
- Existing localStorage stores remain the source of truth. No second state system is introduced.
- LevelUp content is retrieved from the existing generated content/search data. No vector database is added.

## Architecture

The AI layer is split into four boundaries:

1. **Contracts and validation** — typed request/context/response contracts with strict limits and deterministic validation for planner, coach, and tutor output.
2. **Context and retrieval** — a compact projection of profile, progress, streak, activity signals, roadmap state, and relevant LevelUp content. Retrieved content is explicitly marked as untrusted reference material and cannot change system instructions.
3. **Providers and domain services** — a deterministic local provider plus a loopback-only Ollama provider locked to `llama3.1:latest`. Coach, planner, and tutor services use the same provider contract.
4. **Native Study UI** — Study Mode renders structured plans, actions, fallback state, loading state, and errors using existing cards and storage conventions.

The local Ollama request contract is:

```text
POST http://127.0.0.1:11434/api/chat
Content-Type: application/json

{
  "operation": "coach" | "planner" | "tutor",
  "model": "llama3.1:latest",
  "stream": false,
  "format": "json",
  "messages": compact system and user messages
}

200 { "message": { "content": "validated JSON result" } }
```

The user's local Ollama installation owns model execution. The browser sends only bounded selected context to loopback, never to LevelUp analytics or a remote server. Public visitors cannot use the owner's computer; each visitor must install and run Ollama locally to use model-powered help.

## MVP behavior

### Planner

Generate one dated plan from available minutes, the profile, active study mission, completion history, streak, quiz weaknesses, reflections/highlights counts, focus sessions, pillar floors, and roadmap phase. Each session has a title, duration, type, reason, and optional chapter/protocol link. Session durations never exceed the requested budget.

### Coach

Answer a bounded set of actionable questions using actual context. Local answers cover today’s focus, missed/recovery patterns, what to learn next, progress/weaknesses, and limited-time planning. The local provider cites the actual signal used in plain language and does not generate generic motivational filler.

### Tutor

Ground explanation, summary, takeaways, mistakes, and practice prompts in a selected chapter’s generated content and quiz data. The UI may add contextual chapter buttons only if the change remains isolated and does not destabilize chapter rendering.

## Persistence and analytics

Generated plans and session completion are persisted under a single additive AI plan key using the existing localStorage-store pattern. The data is local-only and does not enter analytics. Analytics receives only event names and safe identifiers such as operation and source, never user text, reflections, prompts, content bodies, or localStorage payloads.

## Safety and failure handling

- Client input is trimmed, length-bounded, and validated before provider calls.
- Context and retrieved content are size-bounded.
- Ollama calls use an abort timeout and never retry requests.
- Invalid Ollama JSON or schema-invalid output is rejected and falls back to the deterministic local provider.
- User content and retrieved documents are wrapped as data, not instructions.
- Result rendering uses ordinary React text nodes; no raw HTML or executable output is accepted.
- Provider errors show a clear fallback state and never crash the dashboard.
- The AI layer has no shell, database, code execution, or privileged action interface.

## Deferred work

- Remote AI services and server-side AI deployment are intentionally out of scope.
- Adaptive roadmap mutation. The current roadmap is read-only context for MVP recommendations; goal-to-milestone editing is deferred until the plan model proves stable.
