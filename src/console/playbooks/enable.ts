import { type Integration } from "@contracts/integrations"
import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"

type AutomationId = FunctionArgs<
  typeof api.automations.console.run
>["automationId"]

export type PlaybookActions = ReturnType<typeof usePlaybookActions>

export function usePlaybookActions(tenantId: string) {
  const enableMutation = useMutation(api.playbooks.console.enable)
  const runMutation = useMutation(api.automations.console.run)
  const pauseMutation = useMutation(api.automations.console.pause)
  const resumeMutation = useMutation(api.automations.console.resume)
  const [pendingKey, setPendingKey] = useState<string>()
  const viewRuns = useViewRunsAction()

  async function withPending(key: string, action: () => Promise<void>) {
    setPendingKey(key)
    try {
      await action()
    } finally {
      setPendingKey(undefined)
    }
  }

  return {
    pendingKey,

    enable: (
      definition: PlaybookDefinition,
      choices: Record<string, Integration>
    ) =>
      withPending(definition.key, async () => {
        try {
          await enableMutation({
            tenantId,
            playbook: definition.key,
            utcOffsetMinutes: new Date().getTimezoneOffset(),
            choices,
          })
          toast.success(`${definition.title} is on`, {
            description: "Your first run just started.",
            action: viewRuns,
          })
        } catch (error) {
          showErrorToast(error, "Couldn't enable the playbook.")
        }
      }),

    runNow: (definition: PlaybookDefinition, automationId: AutomationId) =>
      withPending(definition.key, async () => {
        try {
          await runMutation({ tenantId, automationId })
          toast.success(`${definition.title} is running`, {
            action: viewRuns,
          })
        } catch (error) {
          showErrorToast(error, "Couldn't start the run.")
        }
      }),

    setPaused: (
      definition: PlaybookDefinition,
      automationId: AutomationId,
      paused: boolean
    ) =>
      withPending(definition.key, async () => {
        try {
          if (paused) {
            await pauseMutation({ tenantId, automationId })
            toast.success(`${definition.title} paused`, {
              description: "It keeps its setup — switch it back on anytime.",
            })
          } else {
            await resumeMutation({ tenantId, automationId })
            toast.success(`${definition.title} is back on`)
          }
        } catch (error) {
          showErrorToast(error, "Couldn't update the playbook.")
        }
      }),
  }
}

function useViewRunsAction() {
  const navigate = useNavigate()

  return {
    label: "View run",
    onClick: () => {
      void navigate({ to: "/runs" })
    },
  }
}
