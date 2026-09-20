import { type ReferenceTarget } from "@contracts/replies/references"
import { useQuery } from "convex/react"
import { useChatLocation } from "@/shared/console/chat/draft"
import { api } from "../../../../convex/_generated/api"

export function useChatEntry(
  organizationId: string,
  context: ReferenceTarget | undefined
) {
  const entry = useQuery(
    api.messages.references.resolve,
    context === undefined ? "skip" : { organizationId, targets: [context] }
  )
  const reference = entry?.[0]?.unavailable === false ? entry[0] : undefined
  const location = useChatLocation(reference)
  const tree = useQuery(api.folders.console.tree, { organizationId })
  const reason =
    context === undefined
      ? undefined
      : entry === undefined
        ? "This resource is still loading. Try sending again in a moment."
        : reference === undefined
          ? "This resource is no longer available. Open a new chat to continue."
          : undefined
  return {
    ...location,
    reference,
    folders: tree?.status === "ready" ? tree.folders : undefined,
    validate: () => {
      if (reason !== undefined) {
        throw new Error(reason)
      }
    },
  }
}
