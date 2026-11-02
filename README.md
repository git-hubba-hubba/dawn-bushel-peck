# Dawn — Organizational Intelligence

Develop ideas through seven organizational agent workflows: Flat, Functional, Divisional, Agile, Matrix, Network, and Decentralized.

## What is implemented

- A modular React dashboard with a tab and document-inspired diagram for every organizational structure.
- PDF, DOCX, TXT, and Markdown ingestion; saved concepts in MongoDB.
- Seven distinct agent workflows with specialist roles, explicit dependencies, controlled parallelism, handoffs, and final deliverables.
- A persistent MongoDB queue, separate worker processes, live step updates, cancellation, and transactional resource accounting.
- Comparison batches using the same saved source and adjustable quality, speed, and token-efficiency weights.
- Measured duration, tokens, handoffs, and optional estimated cost; separately labeled model judgments for quality and organizational purpose fit.
- Workspace draft/task tools; payment and critical software restructuring approval gates; unconfigured external tools remain blocked.
- Email/password accounts with private workspaces, a preserved owner login, server-side provider credentials, hashed session tokens, HttpOnly cookies, strict request origins, input validation, bounded isolated document extraction, and cascading project deletion.

This is an executable first implementation, not a live configured deployment. MongoDB/OpenAI credentials are intentionally absent. Real model performance and outputs have not been verified against a paid API account. External service adapters need their service connections before execution is available.

## Setup

Use Node.js 24+ and a MongoDB replica set (MongoDB Atlas works). Transactions are required for queue capacity and deletion consistency; a standalone MongoDB server is insufficient.

Install dependencies if needed:

```sh
npm ci
npm ci --prefix backend
npm ci --prefix frontend/dawn_admin
```

Create your local environment file:

```sh
cp backend/example.env backend/.env
```

Edit `backend/.env`:

- `MONGODB_URI`: your replica-set/Atlas URI; use a database user scoped to the Dawn database.
- `MONGODB_DB`: database name, default `dawn`.
- `OPENAI_API_KEY`: server-only OpenAI project key.
- `WORKSPACE_PASSWORD`: a unique password of at least 16 characters.
- `APP_ORIGIN`: exact browser origin, default `http://localhost:5173`.
- Optional pricing settings: USD per million tokens for the configured models. Unset values show cost as unknown. These are estimates, not billing records.

Run these commands in separate terminals from the repository root:

```sh
npm run server
npm run worker
npm run dev
```

Open `http://localhost:5173`. Choose **Create your workspace** to register with an email and a password of at least 16 characters, or choose **Sign in**. The **Existing owner workspace** option accepts the configured workspace password. Upload a document or write a concept, select a structure, and run it. Use **Compare all 7 structures** to create a batch; inspect **Top structures** to rank completed runs. Comparison runs incur provider usage across all seven workflows.

The development frontend uses port 5173 and fails if that port is occupied, rather than silently switching ports. It proxies `/api` to `127.0.0.1:4000`. In development, the origin check accepts localhost, 127.0.0.1, and IPv6 loopback aliases on the configured APP_ORIGIN scheme and port. Production requires the exact configured origin. Restart the API after changing APP_ORIGIN. The API binds to loopback by default. The worker must run separately; queued runs stay queued while it is stopped. You may run multiple workers; each claims a different run atomically.

## Model choice

The default is `gpt-6-astra` with high reasoning through the Responses API, chosen for demanding reasoning and document development. Both agent and evaluator models are configurable. This choice follows [official OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-6-astra) and the [Responses API](https://developers.openai.com/api/reference/responses/overview). API access depends on your account. No secrets or provider clients are bundled into the browser.

## Evaluation method

Quality averages the evaluator's quality and structure-purpose-fit scores. The quality rubric weighs grounding, feasibility, completeness, and actionable clarity equally. Purpose fit assesses the documented authority, information flow, purpose, and mitigation of structural risks.

Speed and token efficiency are normalized to the fastest and least-token completed run **within the selected batch**. The weighted score uses your chosen priorities. Equal weights are the visible starting configuration. Rankings remain provisional until the batch completes; failed/cancelled runs are excluded. Model judgments are not evidence that a structure will guarantee commercial success. A one-run batch cannot establish a comparative winner.

Execution duration excludes evaluator latency; total duration includes it. Tokens include both execution and evaluation. Queue waiting time is excluded. Workflows have different numbers of roles; resource differences are visible, rather than hidden by invented benchmark scores. Cached input, model-specific prices, and provider billing adjustments are not included in optional cost estimates.

## Action permissions

Free workspace `create_draft` and `create_task` actions can execute after a successful run. Results appear in the studio’s **Actions & saved deliverables** section. Other tools are blocked until server adapters are registered.

Risk metadata is defined by trusted server adapters, not by the model. `requiresPayment` and `restructuresSoftware` require explicit approval. Unknown tools cannot become permitted merely because a model requests them. The tool execution boundary validates payloads and checks workspace ownership. Adapters for external services must use least-privilege credentials, allowed destinations, idempotency keys, bounded timeouts, and their own audit/error handling. Do not register arbitrary shell execution, model-selected URLs, package installers, or payment operations without appropriately scoped policy.

## Checks

```sh
npm test
npm run lint
npm run build
npm --prefix backend run test:integration
npm --prefix frontend/dawn_admin run test:e2e
```

Unit tests exercise all seven workflow dependencies, cancellation, provider failure, ranking, validation, password/origin protections, and action risk gates. Integration tests use a disposable MongoDB replica set, may download a test binary, and verify authenticated APIs, ingestion, queue transactions, results, approvals, saved artifacts, and deletion. Browser tests use installed Google Chrome and verify tabs, comparisons, execution gates, and desktop/mobile layouts. No tests call the paid OpenAI API.

## Deployment boundaries

Serve the built frontend and `/api` under the same HTTPS origin. Set `NODE_ENV=production`, `APP_ORIGIN` to the HTTPS origin, and configure a reverse proxy appropriate to your deployment. Do not expose the development server. Configure encrypted MongoDB connections, least-privilege credentials, backups, and retention rules for your deployment. Parsed content, run results and drafts persist until deleted; original uploaded binaries are not retained.

This version supports independent accounts with private workspaces and a legacy owner workspace. Account recovery, email verification, team membership, SSO, production monitoring, and distributed HTTP rate limiting need a deployment-specific implementation. In-process rate limiting is intended for one API instance. Document extraction is bounded but is not an antivirus/OCR service. Live provider calls need end-to-end verification after credentials are configured.

Read [the architecture and source mapping](docs/architecture.md) for workflow details.

## Workflow experience

Save a workflow explicitly before execution, or upload a document to save it automatically. Editing a saved source creates a new workflow on the next save, preserving earlier execution sources. The studio retains its editor while viewing Top structures. All seven organizational tabs keep their distinct dependency graphs. Agent mandates now include production readiness: requirements, implementation deliverables, validation, operations and launch/rollback planning. Actual external deployment still requires a configured, scoped adapter and a defined target.

Top structures displays up to three completed runs from a comparison batch, with measured runtime, tokens and handoffs alongside evaluator judgments and evidence. Compare all seven on the same source for a full comparison; incomplete batches remain provisional.

Provider output streams into bounded, unvalidated draft previews, persisted at most once per second per agent. Active runs refresh in the browser every second. These previews show generated output, not private model reasoning. Only a completed, schema-validated response becomes a deliverable. Credentials are still needed to verify live provider execution.

The welcome page uses CSS perspective and SVG tool symbols for its sunrise and orbit animation, with continuous motion while the splash page is open. Account passwords are salted and hashed using server-side scrypt; MongoDB enforces unique normalized email addresses. Signup and sign-in are rate limited and use the existing secure cookie/session boundary. New account workspace IDs are derived from the stored account ID, never supplied by the browser. Restart the API after updating to initialize the account index.

## Guided demo

Choose **Demo_Dawn** on the welcome/login page to open an account-free, four-step tutorial: sample source, seven structures, dependency-based agent replay, and example deliverables/recommendations. All tutorial content is explicitly illustrative; it makes no provider calls or database mutations and reports no invented benchmark metrics. Download `frontend/dawn_admin/public/demo-workflow.md` and upload it into your account to run the same brief against the configured provider. Real execution requires the API, MongoDB, provider credentials, and a worker.

Results lead with the workflow summary, observed resource usage, agent decisions, and next actions. Full deliverables, unresolved requirements, evaluator reasoning, and agent contributions remain available in expandable sections. Structure recommendation cards separate rationale, evidence, and trade-offs; measured runtime/tokens remain distinct from AI judgments. Demo results add purpose-labeled deliverable cards and explain clarity, visibility, and comparison as product capabilities without claiming measured business gains.

## Idea-specific guidance before execution

The studio starts with your saved source and an automatic assessment before the seven structure tabs. After 1.5 seconds without typing, an authenticated, provider-configured workspace saves the brief and starts the assessment. Uploads and loaded sources also trigger assessment; matching cached results are reused. The editor remains usable during assessment, outdated responses are discarded, and failures wait for an explicit retry instead of looping. Autosave and provider-usage notices appear beside the editor. This authenticated assessment ranks three structures against your idea and the current quality/speed/efficiency priorities. It cites exact source snippets, explains trade-offs, gives a concrete first action, and identifies missing requirements. Assessment results persist with the source and are reused for matching priorities. Editing a brief clears the displayed assessment. Assessments incur provider usage and are model judgments, not measured benchmarks or a guaranteed optimal choice. Requests are rate limited and one assessment per workspace can run at a time on an API instance.

New final reports contain a structured, idea-specific roadmap with proposed owners, relative estimated day ranges, dependencies, worked examples, source evidence, acceptance criteria, and assumptions to confirm. Dependency checks reject overlapping predecessor/downstream schedules; independent tasks can run in parallel. Timeline estimates depend on staffing, approvals, and configured services and are not commitments. Older saved reports remain readable; rerun a source to generate the new roadmap. The demo shows an illustrative Day 1–14 repair-pilot plan with intake development and operations preparation in parallel.

Ecosystems can be browsed as a horizontal carousel in the workspace and demo. Each slide groups three execution-pattern advantages, its diagram, best-fit context, authority, information flow, and a trade-off. Use touch/horizontal scrolling, previous/next arrows, structure tabs, or Left/Right/Home/End keys on the tabs. Only the active slide is interactive or exposed to assistive navigation. Workspace-specific typography and layout styling leave the splash page styles and animation unchanged.

Assessment evidence uses server-assigned source passage IDs constrained by the provider's structured-output schema; the API resolves IDs to the original source text. Unknown references are rejected. Assessment failures distinguish provider access, quota/rate limits, unavailable models, rejected request settings, incomplete/invalid output, grounding failures, and persistence failures. Server diagnostics log only the safe failure category, never provider messages or source content.

After an idea is entered, the editor shows a grounded-evidence guide: goal/users, workflow rules, available resources, constraints, acceptance criteria, and supporting sources/unknowns. Examples are explicitly illustrative. Once assessed, the guide highlights idea-specific missing requirements and exposes original cited passages. Users can add only their own answers through the evidence form; this updates the brief and triggers reassessment. Example text is never inserted automatically, and unknowns can remain explicit.

## Idea-first studio

The studio guides users from describing an idea to reviewing a leading fit recommendation and comparing all seven ecosystems. Quality/fit, speed, and token-efficiency priorities are available beside the editor and shared with the results view. Uploading a brief remains available; saving without assessment and single-ecosystem execution are secondary options. The comparison view includes a table of every completed structure alongside the leading three cards. Recommendation judgments remain provisional, and measured runtime/token usage stays labeled separately. The interface uses responsive layouts, accessible form labels, keyboard-operable navigation, and Dawn’s sunrise palette.

The demo also includes an animated virtual walkthrough with four captioned scenes: a sample idea taking shape, all seven structures, dependency-driven agent handoffs, and the authored recommendation/deliverable package. Start the guided tour for automatic chapter progression, pause/resume, or restart; manual chapter navigation and expandable details remain available. Playback pauses when the browser tab is hidden, and reduced-motion preferences remove visual movement. All content remains illustrative and makes no provider calls or account mutations.

## Render deployment

See [the Render deployment guide](docs/render.md). From the repository root, use `npm run build:render` as the web service build command and `npm start` as its start command. Production Express serves the built frontend and API on the same origin. A separate background worker (`npm run worker`) processes executions. Add secrets only in Render's environment settings; review service costs before provisioning.
