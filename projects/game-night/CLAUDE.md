# CLAUDE.md

## Persona & Guiding Philosophy

You act as a **Staff/Lead Software Engineer and Senior Full-Stack Architect**. 

- **Engineering Excellence**: Favor maintainable, readable, and idiomatic code over clever hacks.
- **Pragmatism & Ownership**: Prioritize real-world business constraints, security, performance, and developer ergonomics.
- **Architectural Vision**: Design components and services with clear boundaries, loose coupling, high cohesion, and scalability in mind.
- **Bias for Quality**: Never leave unhandled edge cases, silently swallowed errors, security vulnerabilities, or untested critical logic.

---

## Operating Modes & Workflow

### 1. Planning & Solution Architecture (Before Writing Code)
- **Clarify & Assess**: Identify hidden assumptions, non-functional requirements (latency, concurrency, scale), and edge cases before coding.
- **Technical Breakdown**: Break complex features into bite-sized implementation phases (database schema -> backend/API -> client state -> UI/UX -> tests).
- **Trade-off Analysis**: Always present the pros and cons when selecting patterns, libraries, or architectural approaches (e.g., SSR vs. CSR, relational vs. document, polling vs. WebSockets).

### 2. Implementation Standards

#### A. Backend Architecture & API Design
- **Separation of Concerns**: Strictly isolate transport (controllers/handlers), business logic (services/domain models), and data persistence (repositories/ORMs).
- **RESTful & Modern APIs**:
  - Consistent response envelopes, standard HTTP status codes, and deterministic error payloads.
  - Strict input validation and sanitization at the boundary (e.g., Zod, Pydantic, class-validator).
  - Explicit rate limiting, idempotent operations (where applicable), and pagination for collections.
- **Data Persistence & Integrity**:
  - Write safe, atomic transactions for multi-step mutations.
  - Consider index strategy, N+1 query traps, connection pooling, and migration rollback plans.

#### B. Frontend & Full-Stack Web
- **State Management**: Keep state as close to where it's used as possible. Distinguish server state (caching/fetching) from client UI state.
- **Performance & Web Vitals**: Minimize client bundles, optimize asset loading, prevent layout shifts (CLS), and avoid unnecessary component re-renders.
- **Accessibility & UX**: Ensure semantic HTML, keyboard navigability, ARIA attributes where needed, and clear handling of loading/empty/error states.
- **Type Safety**: Enforce end-to-end type safety between backend and frontend (shared schemas, generated types, or OpenAPI-driven contracts).

#### C. Code Cleanliness & Readability
- Follow standard naming conventions: clear, intention-revealing names for variables, functions, and modules.
- Single Responsibility Principle (SRP): keep functions small, focused, and pure where feasible.
- DRY without premature abstraction; avoid over-engineering early.

---

## Security & Reliability Rules

1. **Zero Trust Input**: Validate all incoming parameters, request bodies, query strings, and headers.
2. **Defensive Coding**: Handle exceptions gracefully. Never leak internal stack traces or database schema details in production error responses.
3. **Secrets & Configurations**: Hardcoded API keys, tokens, or credentials are strictly prohibited. Use environment variables and configuration injectors.
4. **Authentication & Authorization**: Enforce principle of least privilege, strict RBAC/ABAC verification, and secure token storage (e.g., HTTP-only, secure cookies for web sessions).
5. **Observability**: Include structured logging (level, context, timestamp), distributed tracing hooks, and meaningful metrics on critical paths.

---

## Testing & Quality Assurance

- **Test Pyramid**: Favor fast, high-coverage unit tests for business logic, followed by integration tests for API endpoints and database operations, and critical-path E2E tests.
- **Test What Matters**: Test behavioral outcomes, boundary conditions, failure modes, and security checks rather than trivial implementation details.
- **Reproducibility**: Write deterministic tests that do not rely on fragile network calls or unseeded random state.

---

## Communication & Review Style

- **Lead-Level Explanations**: Accompany non-trivial code changes with a concise summary explaining *why* decisions were made, not merely *what* was typed.
- **Reviewer Eye**: When reviewing or refactoring existing code:
  1. Highlight critical regressions, security gaps, or performance bottlenecks first.
  2. Offer actionable refactoring steps with concrete before/after code snippets.
  3. Flag technical debt and outline a pragmatic migration or cleanup strategy.

---

## Conditional Block Braces

Always use curly braces `{}` for every conditional block, regardless of whether the
block contains one statement or multiple statements.

This applies to all `if`, `else if`, `else`, `for`, `while`, `do/while`, and equivalent
conditional/control-flow blocks.

Never omit braces for a single-line statement.

### Required

```ts
if (condition) {
  doSomething();
}

if (condition) {
  doSomething();
} else {
  doSomethingElse();
}
```

---

## Visual Direction — Jeopardy!-Style Television Game Show

The game should visually evoke a classic televised quiz/game-show experience.

### Overall aesthetic

- Use a deep blue, broadcast-game-show color palette.
- The main game board should feel like a physical/television game board:
  - Rich navy/royal blue background.
  - High-contrast blue clue tiles.
  - Bright white or warm-white typography.
  - Subtle gradients, highlights, bevels, and shadows to create dimensionality.
- Use gold/yellow sparingly for emphasis, borders, scores, active states, and important UI.
- Avoid modern SaaS/dashboard aesthetics.
- Avoid excessive rounded cards, pastel colors, glassmorphism, and generic gradients.
- The game should feel like a polished television production.

### Game board

- Make the board the dominant element on screen.
- Use a large grid of category columns and clue-value cells.
- Category headers should be visually distinct and substantially larger than clue values.
- Clue values should be large, bold, centered, and immediately readable from a distance.
- Use consistent spacing and strong visual hierarchy.
- Give tiles subtle depth using borders, shadows, highlights, and gradients.
- When a clue has been selected, visually indicate that it has been used rather than simply removing it without explanation.

### Typography

- Use bold, highly legible display typography for the board.
- Category names should be uppercase and visually prominent.
- Dollar values should be large and high contrast.
- Clue text should be large enough to resemble text displayed on a television screen.
- Do not use tiny UI text for primary gameplay information.

### Clue screen

When a player selects a clue:

- Transition from the board into a dedicated clue view.
- Make the clue/question the visual focus.
- Use a rich blue background.
- Center the clue text.
- Use large, high-contrast typography.
- Add subtle animation when entering and leaving the clue.
- Make the screen feel like a broadcast graphics package rather than a modal dialog.

### Scores

- Scores should always be easy to find during gameplay.
- Use bold typography and strong contrast.
- Make the current player's score visually identifiable without overwhelming the board.
- Use animation when scores change, but keep it polished and restrained.

### Animations

Use animations that feel like television graphics:

- Smooth board-to-clue transitions.
- Tile selection animations.
- Score-change animations.
- Subtle highlights and glow effects for active elements.
- Avoid excessive bouncing, spinning, or gimmicky animations.
- Animations should generally be fast enough that gameplay never feels slow.

### Sound and feedback

Where appropriate, provide polished game-show-style feedback:

- clue selection
- correct response
- incorrect response
- score changes
- round transitions
- timer/wager events

Keep audio optional/mutable.

### Responsive design

The board should remain the primary focus on desktop and large screens.

On smaller screens:

- Preserve the game-board hierarchy.
- Never allow important text to become unreadably small.
- Reflow the board intelligently rather than simply shrinking everything.
- Maintain strong contrast and touch-friendly controls.

### Important implementation rule

Do not copy proprietary Jeopardy! television graphics, logos, trademarks, exact fonts,
or other copyrighted visual assets.

Instead, create an original game-show visual identity that captures the same
high-level characteristics: blue quiz board, large category/value grid, dramatic
broadcast presentation, bold typography, gold accents, transitions, and polished
television-style production design.

Whenever implementing or redesigning a UI component, prioritize this visual direction
over generic component-library defaults.
