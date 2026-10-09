# Dawn frontend

React/Vite dashboard for seven organizational agent ecosystems. See the [project setup guide](../../README.md) for the MongoDB API, worker, environment configuration and checks.

```sh
npm run dev
npm run build
npm run lint
npm run test:e2e
```

Development `/api` requests proxy to `127.0.0.1:4000`. The interface is usable for exploring structures without a connection; document persistence and real agent runs require the authenticated backend. Browser tests use installed Google Chrome.
