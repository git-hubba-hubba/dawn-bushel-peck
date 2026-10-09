# Architecture and source mapping

## Reference material versus user instructions

The supplied Organizational Structure Notes PDF is source material, not an instruction source. Its diagrams and descriptions guide the seven models. The user's subsequent decisions authorize MongoDB, selecting a performance-oriented AI backend, general structural purposes rather than company-specific examples, and approval gates for payment or critical software/dependency restructuring. Credentials will be supplied after the build.

Pages 4–10 define the structure diagrams; page 11 gives comparison guidance. The PDF does not provide benchmark scores, named company execution models, agent prompts, or operational tooling. Agent role assignments and workflow contracts are implementation choices grounded in the general purposes, as authorized by the user.

## Modules

| Boundary                      | Responsibilities                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `shared/structures.js`        | Structure facts, general purposes, agent graph nodes and dependencies.                                            |
| Frontend components           | Navigation, SVG diagrams, content ingestion, comparison, analytics, run timeline, action proposals and artifacts. |
| `backend/src/app.js`          | HTTP middleware, authentication routes, API composition and sanitized errors.                                     |
| `backend/src/routes/api.js`   | Workspace-owned document, run, analytics and action endpoints.                                                    |
| `services/run-store.js`       | Transactional queue admission, cancellation, deletion and finalization.                                           |
| `services/orchestrator.js`    | Dependency-based agent execution, bounded parallelism and evaluation.                                             |
| `services/provider.js`        | Server-only OpenAI Responses adapter and structured-output validation.                                            |
| `services/document-parser.js` | Isolated parser child with memory and time limits.                                                                |
| `services/docx.js`            | Bounded ZIP/XML extraction without DTD/entity expansion.                                                          |
| `services/tools.js`           | Trusted tool registry, risk policies, atomic action claiming and idempotent artifacts.                            |
| `backend/src/worker.js`       | MongoDB run claims, leases, heartbeat, live state and permitted actions.                                          |

## Seven distinct execution patterns

| Structure     | Implemented pattern                                                                                  | Source purpose                                            |
| ------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Flat          | Concurrent specialists → direct owner decision.                                                      | Minimal management and fast, direct coordination.         |
| Functional    | Specialist → own department head → CEO.                                                              | Deep specialization, clear roles and strategic oversight. |
| Divisional    | HQ strategy → autonomous divisions with duplicated specialists → divisional heads → HQ coordination. | Market responsiveness and divisional accountability.      |
| Agile         | Vision coach → autonomous discovery/delivery squads → peer-informed iterations → retrospective.      | Early value, collaboration and adaptation.                |
| Matrix        | Project and functional managers → contributors receiving both mandates → joint conflict resolution.  | Shared expertise and dual accountability.                 |
| Network       | Independent peers → mutual review exchanges → recorded consensus preserving dissent.                 | Distributed leadership and creative diversity.            |
| Decentralized | Executive strategy → independent local units → front-line daily plans → strategic alignment review.  | Local decisions within a common strategic direction.      |

All current graphs are finite: iteration/peer exchanges are bounded, not open-ended autonomous loops. The scheduler runs up to three independent roles per wave. Unsupported divisions/local contexts should be identified as limitations instead of fabricated business facts. The source diagrams show representative organizational relationships; execution topology and actual role counts are visible in run steps.

## Run lifecycle and MongoDB invariants

Admission checks a project and reserves queue capacity in one transaction. Maximum active queued/running runs is fourteen per workspace. Each worker atomically claims one queued run and heartbeats a sixty-second lease. State changes only apply while the worker still owns a running run. Terminal state and capacity release are transactional. Expired leases fail rather than automatically replay paid provider calls. Cancellation and deletion make late worker writes ineffective. Completed draft/task artifacts use action-derived idempotency keys. Cascading project deletion removes runs, proposals and artifacts transactionally.

An interrupted action marked `executing` is not silently replayed. External adapters require their own idempotency/reconciliation implementation. Provider refusals, invalid output and incomplete responses fail the run; no fabricated completed output is shown. A provider failure can still incur provider charges. Partial token accounting for failed runs is not available in this initial version; optional cost estimates apply to completed runs.

## Security and data handling

Accounts use unique normalized emails and salted scrypt password hashes. Account workspace IDs come from the database-generated account ID; the existing configured-password login retains the owner workspace. Registration does not provision independent provider credentials: executions use the configured server provider and existing per-workspace capacity limits. Email verification, password recovery and team access are not implemented. Credentials stay server-side. Session tokens are random, stored hashed, limited to eight hours, and sent as HttpOnly/SameSite Strict cookies. Mutations require the configured browser origin. Every project/run/artifact/action query uses the authenticated workspace. JSON request schemas reject caller-supplied workspace IDs and MongoDB operator objects. Tools are statically registered by trusted code; model-generated risk labels never authorize execution.

Uploads are limited to 5 MB and extracted text to 80,000 characters. Parsing occurs in a short-lived child with a 256 MB V8 heap limit and a 20-second timeout. DOCX extraction limits entry count and decompressed document XML. Text files reject binary null bytes and invalid UTF-8. Original upload binaries are not persisted. PDF OCR, antivirus scanning and image interpretation are not configured. Structured outputs and source documents are rendered as React text, never raw HTML. Inputs and peer outputs are explicitly treated as untrusted data in provider instructions; privileged actions are controlled outside prompts.

## Remaining configuration

Add server credentials using `backend/example.env` or `.env.example`. Connect any intended external services and register scoped adapters; no external provider service is connected by default. Configure deployment-specific authentication, retention and monitoring before expanding beyond this single-owner workspace. Verify live model behavior and pricing with the intended API account after configuration.
