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
