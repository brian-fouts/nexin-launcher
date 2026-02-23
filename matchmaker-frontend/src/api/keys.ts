/**
 * Central query keys for React Query. Invalidate these when backend data changes.
 * When adding new endpoints, add keys here and use them in api/hooks.ts.
 */
export const queryKeys = {
  health: () => ['api', 'health'] as const,
  items: {
    all: ['api', 'items'] as const,
    list: () => [...queryKeys.items.all, 'list'] as const,
    detail: (id: number | null) => [...queryKeys.items.all, 'detail', id] as const,
  },
  apps: {
    all: ['api', 'apps'] as const,
    list: () => [...queryKeys.apps.all, 'list'] as const,
    detail: (id: string | null) => [...queryKeys.apps.all, 'detail', id] as const,
    servers: (appId: string | null) => [...queryKeys.apps.all, 'servers', appId] as const,
  },
}
