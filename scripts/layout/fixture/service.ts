import { ConvexReactClient } from "convex/react"
import { type FunctionReference, getFunctionName } from "convex/server"

/** Local data for real Convex React hooks. Each scenario uses one argument
 * set per query name; subscribed queries and writes never open a socket. */
export function localService() {
  const values = new Map<string, unknown>()
  const listeners = new Set<() => void>()
  const client = new ConvexReactClient("https://layout-fixture.invalid", {
    unsavedChangesWarning: false,
  })
  const controls = {
    action: async (_args: Record<string, unknown>) => ({}),
    mutation: async (_args: Record<string, unknown>): Promise<unknown> => ({}),
  }
  Object.assign(client, {
    watchQuery: (query: FunctionReference<"query">) => ({
      localQueryResult: () => values.get(getFunctionName(query)),
      onUpdate: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      journal: () => undefined,
    }),
    mutation: (
      _query: FunctionReference<"mutation">,
      args: Record<string, unknown>
    ) => controls.mutation(args),
    action: (
      _query: FunctionReference<"action">,
      args: Record<string, unknown>
    ) => controls.action(args),
  })
  return {
    client,
    controls,
    publish: (name: string, value: unknown) => {
      values.set(name, value)
      for (const listener of listeners) {
        listener()
      }
    },
  }
}

export const delay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 1100))
