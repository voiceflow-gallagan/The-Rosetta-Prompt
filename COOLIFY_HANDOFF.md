# Coolify Handoff: The Rosetta Prompt (Fork Deployment)

This document captures what was implemented to make [The Rosetta Prompt](https://github.com/muratcankoylan/The-Rosetta-Prompt) deployable on **Coolify** via **Docker Compose**, with configurable external ports and a clean “one-domain” setup (UI proxies API).

## Summary of the approach

- **Backend (API)** runs FastAPI via `uvicorn` in a container.
  - Listens on `0.0.0.0:${PORT:-8000}` inside the container.
- **Frontend (UI)** is built once and served by **Nginx**.
  - Nginx reverse-proxies `/api/*` to the backend container (`api:8000`) so UI and API can share a single domain.
- **Runtime UI config**:
  - The UI reads API base URL from `/env.js` at runtime.
  - In Docker, `env.js` is generated on container start using `UI_API_BASE` (defaults to `/api`).
  - This avoids baking environment values into the React build and makes Coolify env changes effective without rebuilding the UI.
- **Provider docs persistence**:
  - `rosetta_prompt/docs/*` is persisted with a Docker volume so updates to provider docs survive redeploys.

## Files added at repo root (deployment)

- `docker-compose.yml` (services: `api`, `ui`, optional `updater`)
- `Dockerfile.api`
- `Dockerfile.ui`
- `Dockerfile.updater` (optional; for running provider-doc updater in Docker)
- `docker/nginx.conf`
- `docker/ui-env.sh`

## UI files changed/added (runtime env)

- **Changed**: `ui/public/index.html`
  - Loads runtime env file with:
    - `<script src="%PUBLIC_URL%/env.js"></script>`
- **Added**: `ui/public/env.js`
  - Dev fallback file used by `npm start`. In Docker it gets overwritten at runtime.
- **Changed**: `ui/src/store.js`
  - `API_BASE` is no longer hardcoded to `http://localhost:8000`.
  - It now resolves in this order:
    1. `window.__ROSETTA_PROMPT__.API_BASE` (from `/env.js`)
    2. `process.env.REACT_APP_API_BASE` (optional)
    3. fallback `http://localhost:8000`

## Docker Compose behavior (key points)

### Services

- **`api`**
  - Exposes container port `8000`
  - External port mapping is controlled by `API_PORT` (optional)
  - Persists:
    - `rosetta_prompt/docs` → volume `rosetta_docs`
    - `rosetta_prompt/logs` → volume `rosetta_logs`

- **`ui`**
  - Serves on container port `80`
  - External port mapping is controlled by `UI_PORT` (optional)
  - Proxies API calls via Nginx:
    - `/api/*` → `http://api:8000/*`
  - Generates runtime env file:
    - `UI_API_BASE` → `/usr/share/nginx/html/env.js`

- **`updater`** (optional)
  - Included behind compose profile `updater`
  - Used to refresh provider prompting docs into `rosetta_prompt/docs`

## Coolify configuration

### Domains (recommended: single domain)

Use **one domain** for the UI and let it proxy the API:

- **Domains for `ui`**: set your public domain (e.g. `rosetta.example.com`)
- **Domains for `api`**: leave empty
- **Domains for `updater`**: leave empty (not a web service)

### Ports

If you attach a domain in Coolify, you **do not need** to set any custom external ports.

- Coolify will route 80/443 automatically to the service behind the domain.
- Leave `API_PORT` and `UI_PORT` unset unless you want to access by `server-ip:port`.

### Environment variables (set in Coolify)

Required for core functionality:

- `OPENROUTER_API_KEY`

Only needed if you use the updater:

- `ANTHROPIC_API_KEY`
- `FIRECRAWL_API_KEY`
- `FIRECRAWL_API_URL` (optional)

Optional:

- `UI_API_BASE`
  - Default: `/api` (recommended with the single-domain setup)
  - If using a separate API domain, set to full URL (example below)

### Optional: password-protect the UI (Basic Auth)

You can lock the UI (and the proxied `/api/*` endpoints) behind **HTTP Basic Auth** at the nginx layer inside the `ui` container.

Set these environment variables on the **`ui` service** in Coolify:

- `UI_BASIC_AUTH_USER`
- `UI_BASIC_AUTH_PASSWORD`

Notes:

- If both variables are set (non-empty), nginx will require a username/password for all routes.
- If either is unset/empty, Basic Auth is disabled (useful for local/dev).

### Optional: separate API domain (not recommended unless needed)

If you want the API on a different domain:

- **Domains for `ui`**: `rosetta.example.com`
- **Domains for `api`**: `api-rosetta.example.com`
- Set in Coolify:
  - `UI_API_BASE=https://api-rosetta.example.com`

## Running locally (sanity check)

```bash
docker compose up --build
```

- UI: `http://localhost:${UI_PORT:-3000}`
- API: `http://localhost:${API_PORT:-8000}`

## Updating provider docs

Provider docs are just files under `rosetta_prompt/docs/*`.

- They are persisted via the `rosetta_docs` volume in Docker Compose.
- Optional updater run (on-demand):

```bash
docker compose --profile updater run --rm updater python agent.py anthropic openai
```

## Keeping the fork up to date with upstream

Best practice is **fork upstream** and keep these deployment changes in the fork. Pull upstream updates when needed:

```bash
git remote add upstream https://github.com/muratcankoylan/The-Rosetta-Prompt.git
git fetch upstream
git merge upstream/main
git push
```


