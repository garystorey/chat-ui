# Deepening Opportunities (architectural candidates)

Date: 2026-05-15

This document records the set of candidate deepening opportunities discovered during an initial scan of the repository. Each candidate is described using the architecture vocabulary: Module, Interface, Implementation, Seam, Adapter, Leverage, Locality, and the Deletion test where applicable.

---

## 1 — Hooks: Fragmented Hook Implementations

- Files: [src/hooks/index.ts](src/hooks/index.ts#L1), [src/hooks/useAvailableModels.ts](src/hooks/useAvailableModels.ts#L1), [src/hooks/useChatCompletionStream.ts](src/hooks/useChatCompletionStream.ts#L1)
- Problem: Hook implementations are scattered and follow inconsistent patterns for state, side-effects and exports. Discovery requires bouncing between small files; common patterns are duplicated across hooks.
- Proposed solution: Group hooks by domain (e.g. `chat`, `ui`, `network`), factor a small shared `BaseHook` helper for recurring patterns (refs, standardized effect/cleanup, error surface), and document the exported Interfaces in `src/hooks/index.ts`.
- Benefits:
  - Locality: concentrate common logic in one Module so maintainers edit behavior in a single place.
  - Leverage: callers gain consistent semantics from a small Interface rather than reimplementing state/side-effect idioms.
  - Tests: shared patterns reduce test surface; hook logic becomes easier to unit test in isolation.
- Deletion test: deleting a shared `BaseHook` should concentrate duplicated patterns into callers — if it does, the helper is earn-ing its keep; if not, reconsider.

---

## 2 — `chatHistory` service: Leaky Adapter

- Files: [src/services/chatHistory.ts](src/services/chatHistory.ts#L1)
- Problem: Environment-specific concerns (for example direct `window` checks) are embedded in the Implementation. That leaks environment knowledge across callers and makes testing adapters harder.
- Proposed solution: Introduce an explicit `EnvironmentAdapter` and inject it into the `ChatHistory` Module. Keep `ChatHistoryAdapter` focused on persistence semantics (save/load messages) and move all platform checks into the Environment adapter.
- Benefits:
  - Locality: environment concerns are concentrated behind the `EnvironmentAdapter` seam.
  - Leverage: callers of `ChatHistory` use a small, stable Interface without needing to know execution environment.
  - Tests: enable simple in-memory adapters for unit tests and a server-side adapter for SSR scenarios.
- Deletion test: if removing the environment checks from `chatHistory` concentrates platform branching into a single adapter, the refactor increases depth.

---

## 3 — Utils: Overloaded Utility Functions

- Files: [src/utils/apiClient.ts](src/utils/apiClient.ts#L1), [src/utils/chat.ts](src/utils/chat.ts#L1)
- Problem: Utilities handle multiple responsibilities such as network streaming, transformation, and error handling in the same Module. The Interface surface is nearly as complex as the Implementation (shallow Module).
- Proposed solution: Split responsibilities into smaller Modules: `api/stream.ts` (streaming transport), `api/error.ts` (ErrorHandler/adapter), `transform/*` (pure transforms). Provide a small shared `ErrorHandler` adapter used by callers.
- Benefits:
  - Locality: each concept (transport, transformation, error handling) lives in its own Module.
  - Leverage: callers compose small focused Adapters instead of reimplementing patterns.
  - Tests: pure transforms and error handling become trivial to unit test.
- Deletion test: removing the overly-composed util should centralize logic into fewer callers only if the split persists; the aim is to increase leverage so deletion concentrates complexity into focused adapters, not scatter it.

---

## 4 — Components: Presentation Mixed With Logic

- Files: [src/components/ChatHeader.tsx](src/components/ChatHeader.tsx#L1), [src/components/Card.tsx](src/components/Card.tsx#L1)
- Problem: UI Modules mix presentation and business logic; Interfaces expose many props and event handlers that mirror internal Implementation details.
- Proposed solution: Extract UI logic into domain hooks (e.g. `useChatHeaderLogic`) and adopt a Container–Presenter pattern: a slim container hook exposes a small Interface (state + commands) and a presentational Module renders the UI.
- Benefits:
  - Locality: business logic lives in the hook Module; UI markup lives in the presenter Module.
  - Leverage: callers can reuse the logic Adapter across different presenters or tests.
  - Tests: logic is unit-testable without rendering; presenters can be snapshot-tested separately.
- Deletion test: deleting the presenter should not force callers to reimplement logic — logic stays behind the seam.

---

## 5 — Chat context: Monolithic `ChatProvider`

- Files: [src/contexts/ChatProvider.tsx](src/contexts/ChatProvider.tsx#L1)
- Problem: A single `ChatContext` Module owns messages, user state, persistence side-effects and other responsibilities. The Interface is broad and change-prone.
- Proposed solution: Split the monolith into focused Modules (for example `MessageContext`, `UserContext`, `ConnectionContext`) and compose them where needed. Expose small Interfaces per concern and keep side-effectful adapters (persistence, network) behind seams.
- Benefits:
  - Locality: maintainers change message-handling in the `MessageContext` only, not across unrelated concerns.
  - Leverage: callers get narrow Interfaces tailored to their needs rather than a bulky Provider Interface.
  - Tests: smaller contexts are easier to mount and assert in unit/integration tests.
- Deletion test: deleting a focused context should force callers to explicitly adopt a replacement adapter; if complexity spans N callers after deletion, the split is justified.

---

## Remaining candidates and current status

This document now lists the outstanding architectural work and the remaining, focused actions that would deepen the repo's Modules and seams. Completed candidates have been removed or folded into the "Changes applied" section below.

### A — Hooks: Fragmented Hook Implementations (REMAINING)

- Files: `src/hooks/*`
- Problem: Hook implementations are still inconsistent in patterns for state, side-effects and exports. Discovery requires bouncing between small files; common patterns are duplicated across hooks.
- Remaining work:
  - Define a small shared helper surface for recurring hook patterns (refs, abortable effects, standardized error surface).
  - Group hooks by domain (chat, ui, network) and export domain indexes from `src/hooks/index.ts`.
  - Add tests that assert consistent lifecycle and cleanup behaviour for the shared helpers.

### B — Utils: Overloaded Utility Functions (PARTIAL — followups)

- Files: `src/utils/*` (notably `apiClient.ts`, `request.ts`, `requestBuilder.ts`, `sseParser.ts`)
- Status: Partial — streaming parsing and request-building have been extracted (`requestBuilder.ts`, `sseParser.ts`) to create clear seams.
- Remaining work:
  - Split transforms and pure helpers into `src/utils/transform/*` where appropriate (e.g., chat/result transforms).
  - Consolidate or formalize an `ErrorHandler` adapter (if not already present) and centralize error extraction/handling in `src/utils/adapters/errorHandler.ts`.
  - Consider a transport layer separation (`src/utils/transport/*`) so SSE and non-SSE transports share `RequestBuilder` and error handling.

## Next actionable steps

- Pick one of the remaining items above to grill and implement next.
- Proposed immediate work (short verticals):
  1. Implement a `hooks/shared` helper with `useAbortableEffect` + a lightweight lifecycle contract; update 2–3 hooks to use it.
  2. Move pure transforms to `src/utils/transform/` and add unit tests for them.
  3. Add a formal `ErrorHandler` adapter module (if missing) and update `apiClient` to accept it explicitly.

---

File created automatically by the architectural scan on 2026-05-15 and edited to reflect progress on 2026-05-18.

---

## Changes applied (summary)

- Implemented `useChatHeaderLogic` and `useHomePanels` to move UI logic into container hooks for `ChatHeader` and `HomePanels` respectively.
- Extracted `requestBuilder.ts` and `sseParser.ts` to separate request-building and SSE parsing responsibilities from `apiClient`/`request`.
- Added `useToolOrchestration` to wrap `runToolOrchestration` and reduce callback surface in `App`.
- Ran full test suite; all tests pass.

---

If you'd like, I can now: (a) implement the small `hooks/shared` helper and convert `useAvailableModels` and one other hook to use it, or (b) start moving pure transforms into `src/utils/transform/`. Which would you prefer?
