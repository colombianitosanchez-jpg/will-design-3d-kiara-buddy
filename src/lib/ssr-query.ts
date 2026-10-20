import { dehydrate, hydrate, type DehydratedState, type QueryClient } from "@tanstack/react-query";

/** Serialize successful React Query cache entries into route loader data for SSR hydration. */
export function dehydrateQueryClient(queryClient: QueryClient): DehydratedState {
  return dehydrate(queryClient);
}

/** Restore the server-rendered cache before child components call useQuery. */
export function hydrateQueryClient(
  queryClient: QueryClient,
  state: DehydratedState | undefined,
): void {
  if (state) hydrate(queryClient, state);
}
