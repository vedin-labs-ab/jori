import { type ComponentProps, useCallback, useEffect, useState } from "react"
import { ChatProgress } from "@/console/chat/progress"
import { resolveReference } from "@/landing/demo/derive/chat"
import { chatContext } from "@/landing/demo/fixtures/chat"
import { useDemoWorkspace } from "@/landing/demo/workspace"
import { type ChatThread } from "@/shared/console/chat/thread"
import { ChatDraftTurn } from "@/shared/console/chat/thread/draft"
import { type ChatRun, type ReferenceTarget } from "@/shared/console/chat/types"
import { useMessages } from "./messages"
import { useProgress } from "./progress"
import { delay, type localService } from "./service"

export function useThread(
  state: string,
  service: ReturnType<typeof localService>
): ComponentProps<typeof ChatThread> {
  const workspace = useDemoWorkspace()
  const now = workspace.state.now
  const messageState = useMessages(state, service, now)
  const { run, resolved, condensed, phase } = useAdvance(state)
  useProgress(state, service, workspace.state, phase)
  const resolve = useCallback(
    (target: ReferenceTarget) =>
      resolved ? resolveReference(workspace.state, target) : undefined,
    [resolved, workspace.state]
  )
  return {
    ...messageState,
    draft:
      run?.status === "running" ? (
        <ChatDraftTurn
          draft={{
            reasoning:
              "Reading the current customer renewals and checking their owners.",
            text: "",
          }}
        />
      ) : undefined,
    live: run,
    now,
    onChoose: () => undefined,
    onOpenReference: () => undefined,
    progress:
      state.startsWith("progress") && run ? (
        <ChatProgress organizationId="layout-chat-fixture" run={run} />
      ) : undefined,
    resolveReference: resolve,
    usage: { ...chatContext, condensed },
  }
}

function useAdvance(state: string) {
  const [resolved, setResolved] = useState(state !== "reference")
  const [condensed, setCondensed] = useState(false)
  const [phase, setPhase] = useState(0)
  const [run, setRun] = useState<ChatRun | null>(
    state === "failed" || state.startsWith("progress")
      ? { id: "runs_tip", status: "running" }
      : null
  )
  useEffect(() => {
    const advance = (event: KeyboardEvent) => {
      if (event.key !== "F8") {
        return
      }
      event.preventDefault()
      void delay().then(() => {
        setResolved(true)
        if (state === "condensed") {
          setCondensed(true)
        }
        if (state === "failed") {
          setRun({
            id: "runs_tip",
            status: "failed",
            endedAt: Date.now(),
            error:
              "The request could not be completed.\nService detail retained for the title.",
          })
        }
        if (state.startsWith("progress")) {
          setPhase((phase) => phase + 1)
        }
      })
    }
    window.addEventListener("keydown", advance)
    return () => window.removeEventListener("keydown", advance)
  }, [state])
  return { run, resolved, condensed, phase }
}
