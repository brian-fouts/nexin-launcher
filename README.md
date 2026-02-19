# Nexin Launcher

Django backend (Python 3.12, PostgreSQL) + React frontend, all runnable with Docker Compose.

## Stack

- **Backend**: Django 5, Django REST Framework, PostgreSQL, Gunicorn. Python 3.12.
- **Frontend**: React 18, Vite, TypeScript, TanStack Query. Instrumented with the backend API.
- **Database**: PostgreSQL 16.
- **Orchestration**: Docker and docker-compose for backend, frontend, and DB.

## Run everything with Docker Compose

From the repo root:

```bash
docker-compose up --build
```

- **Frontend**: http://localhost:5173  
- **Backend API**: http://localhost:8000 (versioned under `/api/v1/`, e.g. http://localhost:8000/api/v1/health/)  
- **DB**: internal; connect with `POSTGRES_*` env vars (see `docker-compose.yml`).

The frontend proxies `/api` to the backend in dev, so the UI works without CORS.

## Backend

- **Tests**: All backend code is covered by automated tests (pytest + Django test client).

  ```bash
  docker-compose run --rm backend pytest
  ```

- **Migrations**: Applied automatically on startup. To create new ones after changing models:

  ```bash
  docker-compose run --rm backend python manage.py makemigrations
  ```

  After pulling changes that touch backend config, rebuild so the container uses the latest code:  
  `docker-compose build --no-cache backend && docker-compose up`

## Frontend

- **API usage**: All API access goes through `frontend/src/api/`:
  - `client.ts`: typed API functions and types.
  - `keys.ts`: React Query key factory for cache invalidation.
  - `hooks.ts`: React Query hooks (useHealth, useItems, useCreateItem, etc.).

When you add new backend endpoints, add corresponding client functions, query keys, hooks, and UI. See **[docs/ENDPOINT_WORKFLOW.md](docs/ENDPOINT_WORKFLOW.md)** for the step-by-step workflow and best practices.

## Project layout

```
nexin-launcher/
├── backend/           # Django app
│   ├── config/        # Django settings, urls, wsgi
│   ├── api/           # API app (models, views, serializers, urls, tests)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/          # React (Vite + TypeScript)
│   ├── src/
│   │   ├── api/       # client, hooks, query keys
│   │   └── pages/     # Health, Items, Home
│   └── Dockerfile
├── docs/
│   └── ENDPOINT_WORKFLOW.md
└── docker-compose.yml
```
