# Deploy Dawn on Render

Deploy the frontend and API as **one Node web service**, plus the existing queue consumer as a **background worker**. Both connect to the same MongoDB replica set. The web service serves the compiled React application and `/api` on one HTTPS origin, preserving the current authentication and cookie model.

These instructions prepare services; they do not create them or authorize charges. Review Render's selected service plans and costs before creating services. Keep the API at one instance because its rate limits and assessment concurrency controls are in-process.

## 1. Push the repository

Commit and push the application source, lockfiles, `.node-version`, and these deployment changes to your Git provider. Do not upload `backend/.env`, `.env`, `node_modules`, or credentials. The frontend is built on Render; `dist` is ignored intentionally.

## 2. Create the web service

In Render, choose **New → Web Service** and connect the repository. Use:

| Setting           | Value                         |
| ----------------- | ----------------------------- |
| Runtime           | Node                          |
| Root directory    | Leave blank (repository root) |
| Build command     | `npm run build:render`        |
| Start command     | `npm start`                   |
| Health check path | `/api/health`                 |

Keep the root directory blank: both backend and frontend import modules from `shared/` at the repository root. The build installs frontend development dependencies explicitly because Vite is a build dependency, including when `NODE_ENV=production` is set.

Add environment variables in Render's dashboard:

| Variable                 | Value                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`               | `production`                                                                                                |
| `HOST`                   | `0.0.0.0`                                                                                                   |
| `APP_ORIGIN`             | The web service's exact HTTPS origin, e.g. `https://your-service.onrender.com` (no path)                    |
| `TRUST_PROXY_HOPS`       | `1` for a direct Render proxy deployment; confirm the actual proxy topology before adding another proxy/CDN |
| `MONGODB_URI`            | Your MongoDB replica-set connection string, entered only in Render                                          |
| `MONGODB_DB`             | Your selected database name; default is `dawn`                                                              |
| `WORKSPACE_PASSWORD`     | Your private owner-workspace password, at least 16 characters                                               |
| `OPENAI_API_KEY`         | Your server-only provider key, when ready for live assessments                                              |
| `OPENAI_MODEL`           | Your configured supported execution model; see `backend/example.env`                                        |
| `OPENAI_EVALUATOR_MODEL` | Your configured supported evaluation model; see `backend/example.env`                                       |

Render supplies `PORT`; do not hardcode it. The server uses Render's provided port. Set `APP_ORIGIN` to the actual assigned domain before testing sign-in, and redeploy after changing it. Update it if moving to a custom domain.

Node is pinned with `.node-version`. Remove an older `NODE_VERSION` dashboard override if one is present, or make it match.

Configure MongoDB network access to permit the services' documented outbound addresses, with an application-scoped database user and encrypted connections. A standalone MongoDB instance cannot support the queue's transactions. The API connects to MongoDB and creates indexes before it starts listening; database connection errors can therefore appear as port/health-check failures.

## 3. Create the worker when ready for live execution

The worker is required for queued executions and seven-structure comparisons. It is not required for the account-free demo. Review its service cost before provisioning it.

Choose **New → Background Worker**, connect the same repository and branch, and use:

| Setting        | Value                                |
| -------------- | ------------------------------------ |
| Runtime        | Node                                 |
| Root directory | Leave blank                          |
| Build command  | `npm ci --prefix backend --omit=dev` |
| Start command  | `npm run worker`                     |

Give it the same `NODE_ENV`, `APP_ORIGIN`, `MONGODB_URI`, `MONGODB_DB`, `WORKSPACE_PASSWORD`, provider key, and model settings as the web service. Optional token-price settings must also match if cost estimates are desired. No HTTP port or health-check path is needed for the worker. Its provider key is required to start.

## 4. Verify

1. Open `https://your-service.onrender.com/api/health`; expect `{"status":"ok"}`.
2. Open the main URL and launch **Demo_Dawn → Start animated tour**. This does not call the provider.
3. Create an account or sign in. Confirm the cookie persists and saved workflows remain private.
4. When you are ready to incur provider usage, enter an idea and verify the assessment. Queue a run and confirm it progresses beyond `queued`; if not, inspect the worker's logs.
5. Compare all seven only when ready for the corresponding provider usage. Review generated judgments separately from measured runtime/tokens.

## Common deployment errors

- **No open ports:** ensure `HOST=0.0.0.0`, use Render's `PORT`, and inspect earlier logs for database/configuration failures.
- **Frontend build missing:** use `npm run build:render` from the repository root before `npm start`.
- **Cannot resolve `shared/`:** leave the Render root directory blank and deploy the whole repository.
- **403 on sign-in or saves:** correct `APP_ORIGIN` to the exact URL used in the browser and redeploy.
- **`X-Forwarded-For` header is set but Express `trust proxy` is false:** in the Render **web service → Environment**, set `TRUST_PROXY_HOPS=1` for the direct Render proxy setup, then save and redeploy/restart the service. A missing value or `0` disables proxy trust. Editing your local `backend/.env` does not update Render. The application already applies this setting before rate limiting; no code change is needed. If you added a separate proxy/CDN, verify the hop count for that topology. Keep proxy trust bounded; do not use unrestricted `true` or disable the rate-limit validation.
- **429 for unrelated visitors:** verify the proxy hop count and topology. Do not set Express proxy trust to unrestricted `true`.
- **Runs stay queued:** deploy/start the worker with the same database and provider configuration.
- **Provider errors:** inspect the UI's safe error category and check account access/model settings in the provider dashboard. Do not share keys or full environment contents in chat.

Official references: [Render web services](https://render.com/docs/web-services), [background workers](https://render.com/docs/background-workers), [Node versions](https://render.com/docs/node-version), and [Express proxy trust](https://expressjs.com/en/guide/behind-proxies/).
