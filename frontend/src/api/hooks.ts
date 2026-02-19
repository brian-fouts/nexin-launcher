/**
 * React Query hooks for API. Add a new hook for each new backend endpoint.
 * Use query keys from keys.ts for cache invalidation.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clearAuth } from './authStorage'
import {
  api,
  type AppCreate,
  type AppUpdate,
  type ItemCreate,
  type ItemUpdate,
  type LoginPayload,
  type RegisterPayload,
  type ServerCreate,
  type ServerUpdate,
} from './client'
import { queryKeys } from './keys'

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: () => api.health(),
    refetchInterval: 30_000,
  })
}

export function useItems() {
  return useQuery({
    queryKey: queryKeys.items.list(),
    queryFn: () => api.items.list(),
  })
}

export function useItem(id: number | null) {
  return useQuery({
    queryKey: queryKeys.items.detail(id),
    queryFn: () => api.items.get(id!),
    enabled: id != null,
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ItemCreate) => api.items.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ItemUpdate }) =>
      api.items.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.items.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.items.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

// --- Auth hooks ---

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => api.auth.register(payload),
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => api.auth.login(payload),
  })
}

export function useLogout() {
  return () => clearAuth()
}

// --- Apps hooks ---

export function useApps() {
  return useQuery({
    queryKey: queryKeys.apps.list(),
    queryFn: () => api.apps.list(),
  })
}

export function useApp(appId: string | null) {
  return useQuery({
    queryKey: queryKeys.apps.detail(appId),
    queryFn: () => api.apps.get(appId!),
    enabled: !!appId,
  })
}

export function useCreateApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AppCreate) => api.apps.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apps.all })
    },
  })
}

export function useUpdateApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ appId, data }: { appId: string; data: AppUpdate }) =>
      api.apps.update(appId, data),
    onSuccess: (_, { appId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.apps.detail(appId) })
      qc.invalidateQueries({ queryKey: queryKeys.apps.all })
    },
  })
}

export function useDeleteApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (appId: string) => api.apps.delete(appId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apps.all })
    },
  })
}

export function useRegenerateAppSecret() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (appId: string) => api.apps.regenerateSecret(appId),
    onSuccess: (_, appId) => {
      qc.invalidateQueries({ queryKey: queryKeys.apps.detail(appId) })
      qc.invalidateQueries({ queryKey: queryKeys.apps.all })
    },
  })
}

export function useGenerateOneTimeToken() {
  return useMutation({
    mutationFn: (appId: string) => api.apps.generateOneTimeToken(appId),
  })
}

export function useValidateOneTimeToken() {
  return useMutation({
    mutationFn: (token: string) => api.oneTimeToken.validate(token),
  })
}

// --- Servers hooks ---

export function useServers(appId: string | null) {
  return useQuery({
    queryKey: queryKeys.apps.servers(appId),
    queryFn: () => api.apps.servers.list(appId!),
    enabled: !!appId,
  })
}

export function useServer(appId: string | null, serverId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.apps.servers(appId), serverId],
    queryFn: () => api.apps.servers.get(appId!, serverId!),
    enabled: !!appId && !!serverId,
  })
}

export function useCreateServer(appId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ServerCreate) => api.apps.servers.create(appId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apps.servers(appId) })
      qc.invalidateQueries({ queryKey: queryKeys.apps.all })
    },
  })
}

export function useUpdateServer(appId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ serverId, data }: { serverId: string; data: ServerUpdate }) =>
      api.apps.servers.update(appId!, serverId, data),
    onSuccess: (_, { serverId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.apps.servers(appId) })
      qc.invalidateQueries({ queryKey: queryKeys.apps.all })
    },
  })
}

export function useDeleteServer(appId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (serverId: string) => api.apps.servers.delete(appId!, serverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apps.servers(appId) })
      qc.invalidateQueries({ queryKey: queryKeys.apps.all })
    },
  })
}
