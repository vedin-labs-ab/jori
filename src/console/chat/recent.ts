import { useQuery } from "convex/react"
import { type ChatConversation } from "@/shared/console/chat/types"
import { useActiveOrganization } from "@/shared/session/auth"
import { api } from "../../../convex/_generated/api"

/** The sidebar and the home read the same page of conversations, so the
 *  client holds one subscription between them. */
export const recentCount = 50

/** The person's most recently active conversations, the first `count` of
 *  them; nothing until they have loaded. */
export function useRecentConversations(
  organizationId: string | undefined,
  count: number
): ChatConversation[] | undefined {
  const result = useQuery(
    api.conversations.console.list,
    organizationId === undefined
      ? "skip"
      : { organizationId, paginationOpts: { cursor: null, numItems: count } }
  )

  return result?.page
}

/** The conversations the sidebar lists, for the active organization. */
export function useSidebarChats() {
  const organizationId = useActiveOrganization().data?.id

  return useRecentConversations(organizationId, recentCount) ?? []
}
