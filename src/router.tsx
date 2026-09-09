import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { WorkspaceNotFound } from "./console/frame/missing"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultNotFoundComponent: WorkspaceNotFound,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })
}

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router requires interface declaration merging
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
