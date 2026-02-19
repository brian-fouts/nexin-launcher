# Adding New Backend Endpoints and Frontend Instrumentation

When you add or change API endpoints, follow this workflow so the frontend stays in sync and everything remains tested.

## 1. Backend: Implement and test

- **Define the endpoint** in `backend/api/views.py` (and `backend/api/urls.py`). All API routes are under `api/v1/` (see `config/urls.py`).
- **Add or update serializers** in `backend/api/serializers.py` if you use DRF serializers.
- **Write automated tests** in `backend/api/tests/` (e.g. `test_*.py`). Every new endpoint should have tests for success and error cases.
- Run tests: from repo root, `docker-compose run --rm backend pytest`, or locally `cd backend && pytest`.

## 2. Frontend: Instrument the API

- **Types and client** in `frontend/src/api/client.ts`:
  - Add TypeScript types for request/response (e.g. `Item`, `ItemCreate`).
  - Add a typed function under `api` or `api.<resource>` that calls the new endpoint (e.g. `api.items.list()`). Use the `API_V1` base path (`/api/v1`) for all URLs.
- **Query keys** in `frontend/src/api/keys.ts`:
  - Add a key factory for the new resource so cache invalidation is consistent (e.g. `items.list()`, `items.detail(id)`).
- **React Query hooks** in `frontend/src/api/hooks.ts`:
  - For GET: `useQuery` with the appropriate `queryKey` and `queryFn` calling the client.
  - For mutations (POST/PUT/PATCH/DELETE): `useMutation` with `onSuccess` invalidating the relevant query keys so the UI refetches.
- **UI** in `frontend/src/pages/` (or new components):
  - Use the new hooks to load and mutate data; show loading and error states.

## 3. Best practices

- **Single source of truth**: Backend defines the contract; frontend types and client mirror it. When the backend changes (fields, status codes), update client types and hooks.
- **Central API layer**: All HTTP calls go through `frontend/src/api/client.ts`. No ad-hoc `fetch` in components.
- **Consistent keys**: Use `queryKeys` in `keys.ts` for every query so invalidation and refetching are predictable.
- **Errors**: Use the shared `ApiError` from the client and surface user-friendly messages in the UI.

## Quick reference

| Backend location        | Frontend location        |
|-------------------------|--------------------------|
| `api/views.py`          | `src/api/client.ts`      |
| `api/urls.py`           | path in `api.*` functions|
| `api/serializers.py`    | types in `client.ts`     |
| `api/tests/`            | (backend only)           |
| —                       | `src/api/keys.ts`        |
| —                       | `src/api/hooks.ts`       |
| —                       | `src/pages/*.tsx`        |
