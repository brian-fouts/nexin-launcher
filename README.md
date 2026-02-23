# Nexin Launcher

Matchmaker backend (Django, Python 3.12, PostgreSQL) + matchmaker frontend (React), all runnable with Docker Compose.

## Stack

- **Matchmaker backend**: Django 5, Django REST Framework, PostgreSQL, Gunicorn. Python 3.12.
- **Matchmaker frontend**: React 18, Vite, TypeScript, TanStack Query. Instrumented with the matchmaker backend API.
- **Database**: PostgreSQL 16.
- **Orchestration**: Docker and docker-compose for matchmaker-backend, matchmaker-frontend, and DB.

## Run everything with Docker Compose

From the repo root:

```bash
docker-compose up --build
```

- **Matchmaker frontend**: http://localhost:5173  
- **Matchmaker backend API**: http://localhost:8000 (versioned under `/api/v1/`, e.g. http://localhost:8000/api/v1/health/)  
- **DB**: internal; connect with `POSTGRES_*` env vars (see `docker-compose.yml`).

The matchmaker frontend proxies `/api` to the matchmaker backend in dev, so the UI works without CORS.

## Matchmaker backend

- **Tests**: All matchmaker backend code is covered by automated tests (pytest + Django test client).

  ```bash
  docker-compose run --rm matchmaker-backend pytest
  ```

- **Migrations**: Applied automatically on startup. To create new ones after changing models:

  ```bash
  docker-compose run --rm matchmaker-backend python manage.py makemigrations
  ```

  After pulling changes that touch matchmaker backend config, rebuild so the container uses the latest code:  
  `docker-compose build --no-cache matchmaker-backend && docker-compose up`

- **App authentication**: Apps can obtain a JWT that authenticates as the app (for server-to-server or programmatic access).  
  **POST** `/api/v1/auth/app-token/` with body `{ "app_id": "<uuid>", "app_secret": "<plaintext>" }` (no user auth).  
  Response: `{ "access": "<jwt>", "expires_in": 3600 }`. Use the token in the `Authorization: Bearer <access>` header.  
  The matchmaker backend treats this as app-authenticated: `request.app` is set and `request.user` is anonymous. Use the `IsAppAuthenticated` or `IsAuthenticatedOrApp` permission classes for endpoints that accept app tokens.

## Matchmaker frontend

- **API usage**: All API access goes through `matchmaker-frontend/src/api/`:
  - `client.ts`: typed API functions and types.
  - `keys.ts`: React Query key factory for cache invalidation.
  - `hooks.ts`: React Query hooks (useHealth, useItems, useCreateItem, etc.).

When you add new matchmaker backend endpoints, add corresponding client functions, query keys, hooks, and UI. See **[docs/ENDPOINT_WORKFLOW.md](docs/ENDPOINT_WORKFLOW.md)** for the step-by-step workflow and best practices.

## Project layout

```
nexin-launcher/
├── matchmaker-backend/   # Django app (matchmaker API)
│   ├── config/          # Django settings, urls, wsgi
│   ├── api/             # API app (models, views, serializers, urls, tests)
│   ├── Dockerfile
│   └── requirements.txt
├── matchmaker-frontend/ # React (Vite + TypeScript)
│   ├── src/
│   │   ├── api/         # client, hooks, query keys
│   │   └── pages/       # Health, Items, Home
│   └── Dockerfile
├── docs/
│   └── ENDPOINT_WORKFLOW.md
└── docker-compose.yml
```
