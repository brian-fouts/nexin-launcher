import { useMutation, useQuery } from '@tanstack/react-query'
import { gameApi } from './client'
import { queryKeys } from './keys'

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: () => gameApi.health(),
    refetchInterval: 30_000,
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: (ticket: string) => gameApi.login(ticket),
  })
}
