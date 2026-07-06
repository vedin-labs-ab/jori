import { type Integration } from "@contracts/integrations"
import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { describePlaybookSchedule } from "@contracts/playbooks/schedule"
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

type PlaybookChoices = Record<string, Integration>

export type PlaybookActionKind = "enable" | "trial" | "run" | "pause"

export type PlaybookActions = ReturnType<typeof usePlaybookActions>

export function usePlaybookActions(tenantId: string) {
  const pending = usePendingAction()

  return {
    pending: pending.current,
    ...useCatalogActions(tenantId, pending),
    ...useAutomationActions(tenantId, pending),
  }
}

function usePendingAction() {
  const [current, setCurrent] = useState<{
    key: string
    kind: PlaybookActionKind
  }>()

  async function wrap(
    key: string,
    kind: PlaybookActionKind,
    action: () => Promise<void>
  ) {
    setCurrent({ key, kind })
    try {
      await action()
    } finally {
      setCurrent(undefined)
    }
  }

  return { current, wrap }
}

function useCatalogActions(
  tenantId: string,
  pending: ReturnType<typeof usePendingAction>
) {
  const enableMutation = useMutation(api.playbooks.console.enable)
  const trialMutation = useMutation(api.playbooks.console.trial)
  const viewRuns = useViewRunsAction()

  return {
    enable: (definition: PlaybookDefinition, choices: PlaybookChoices) =>
      pending.wrap(definition.key, "enable", async () => {
        try {
          await enableMutation({
            tenantId,
            playbook: definition.key,
            utcOffsetMinutes: new Date().getTimezoneOffset(),
            choices,
          })
          toast.success(`${definition.title} is on`, {
            description: `Runs ${lowercaseFirst(
              describePlaybookSchedule(definition.schedule)
            )}.`,
          })
        } catch (error) {
          showErrorToast(error, "Couldn't enable the playbook.")
        }
      }),

    trial: (definition: PlaybookDefinition, choices: PlaybookChoices) =>
      pending.wrap(definition.key, "trial", async () => {
        try {
          await trialMutation({ tenantId, playbook: definition.key, choices })
          toast.success(`${definition.title} is running`, {
            description: "One-time run — nothing is enabled.",
            action: viewRuns,
          })
        } catch (error) {
          showErrorToast(error, "Couldn't start the run.")
        }
      }),
  }
}

function useAutomationActions(
  tenantId: string,
  pending: ReturnType<typeof usePendingAction>
) {
  const runMutation = useMutation(api.automations.console.run)
  const pauseMutation = useMutation(api.automations.console.pause)
  const resumeMutation = useMutation(api.automations.console.resume)
  const viewRuns = useViewRunsAction()

  return {
    runNow: (definition: PlaybookDefinition, automationId: AutomationId) =>
      pending.wrap(definition.key, "run", async () => {
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
      pending.wrap(definition.key, "pause", async () => {
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

function lowercaseFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1)
}
