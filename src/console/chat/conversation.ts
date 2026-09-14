import { useMutation } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { type GenericId } from "convex/values"
import { useCallback, useState } from "react"
import { type OpenTarget, usePaneTabs } from "@/shared/console/chat/pane/tabs"
import { type ChatRun } from "@/shared/console/chat/types"
import { showErrorToast } from "@/shared/console/error"
import { useLatestCallback } from "@/shared/console/retain"
import { api } from "../../../convex/_generated/api"
import { type ReferenceTarget } from "../../shared/console/references"
import { useMentionSources } from "./mentions"
import { useConversationMessages } from "./messages"
import { useChooseModel } from "./models"
import { useReferences } from "./references"
import { useSendMessage } from "./send"

export type LiveConversation = Extract<
  FunctionReturnType<typeof api.conversations.console.live>,
  { status: "ready" }
>

/** Everything a conversation's page binds: its messages, the ways to
 *  send into it and to stop its run, what it may mention, its pane, and
 *  the names of what it refers to. The handlers keep their identity, so
 *  the memoized views they reach stay put. */
export function useConversation(
  organizationId: string,
  conversationId: GenericId<"conversations">,
  live: LiveConversation
) {
  const page = useConversationMessages(organizationId, conversationId)
  const { autoOpen, openTarget, pane, releaseTarget } = usePaneTabs()
  const mentioned = useMentioned(openTarget)

  return {
    autoOpen,
    choose: useChooseModel(organizationId, conversationId),
    mentioned,
    mentions: useMentionSources(organizationId, conversationId),
    openTarget,
    page,
    pane,
    releaseTarget,
    resolveReference: useReferences(
      organizationId,
      page.messages,
      mentioned.targets
    ),
    send: useLatestCallback(
      useSendMessage(organizationId, { author: live.viewer ?? undefined })
    ),
    stop: useStopRun(organizationId, live.run),
  }
}

/** The resources the composer has mentioned, kept so the pane can name a
 *  tab opened on one before any message carries it; `open` notes the
 *  mention and opens it. */
function useMentioned(openTarget: OpenTarget) {
  const [targets, setTargets] = useState<ReferenceTarget[]>([])

  return {
    open: useCallback(
      (target: ReferenceTarget) => {
        setTargets((current) =>
          current.some(
            (candidate) =>
              candidate.kind === target.kind && candidate.id === target.id
          )
            ? current
            : [...current, target]
        )
        openTarget(target)
      },
      [openTarget]
    ),
    targets,
  }
}

/** Stops the live run the way the Activity page does; a failure says so. */
function useStopRun(organizationId: string, run: ChatRun | null) {
  const stop = useMutation(api.runs.control.stop)
  const runId = run === null ? undefined : (run.id as GenericId<"runs">)

  return useCallback(() => {
    if (runId === undefined) {
      return
    }

    void stop({ organizationId, runId }).catch((error: unknown) =>
      showErrorToast(error, "Couldn't stop the run.")
    )
  }, [organizationId, runId, stop])
}
