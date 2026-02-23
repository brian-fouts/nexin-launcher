export const queryKeys = {
  health: () => ['game-api', 'health'] as const,
  login: (ticket: string | null) => ['game-api', 'login', ticket] as const,
}
