import { type Integration } from "@contracts/integrations"
import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { type DeliveryChoice } from "@contracts/playbooks/delivery"
import { describePlaybookSchedule } from "@contracts/playbooks/schedule"
import { useNavigate } from "@tanstack/react-router"
import { useConvex, useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { type AutomationEditorHost } from "../automations/editor/host"
import { automationFormValues } from "../automations/editor/save"
import { showErrorToast } from "../shared/error"

type AutomationId = FunctionArgs<
  typeof api.automations.console.run
>["automationId"]

type PlaybookChoices = Record<string, Integration>

export type PlaybookActionKind =
  | "enable"
  | "trial"
  | "run"
  | "pause"
  | "edit"
  | "advanced"

export type PlaybookActions = ReturnType<typeof usePlaybookActions>

export function usePlaybookActions(
  tenantId: string,
  editorHost: AutomationEditorHost
) {
  const pending = usePendingAction()

  return {
    pending: pending.current,
    preloadEdit: editorHost.preloadDialog,
    ...useCatalogActions(tenantId, pending),
    ...useAutomationActions(tenantId, pending),
    ...useEditActions(tenantId, pending, editorHost),
  }
}

/** Opens the shared automation editor from a playbook — existing or draft. */
function useEditActions(
  tenantId: string,
  pending: ReturnType<typeof usePendingAction>,
  editorHost: AutomationEditorHost
) {
  const convex = useConvex()

  return {
    edit: (definition: PlaybookDefinition, automationId: AutomationId) =>
      pending.wrap(definition.key, "edit", async () => {
        editorHost.preloadDialog()
        try {
          const automation = await convex.query(api.automations.console.get, {
            tenantId,
            automationId,
          })
          editorHost.editor.openEditForm(automation)
        } catch (error) {
          showErrorToast(error, "Couldn't open the automation.")
        }
      }),

    openAdvanced: (
      definition: PlaybookDefinition,
      choices: PlaybookChoices,
      destination: DeliveryChoice
    ) =>
      pending.wrap(definition.key, "advanced", async () => {
        editorHost.preloadDialog()
        try {
          const draft = await convex.query(api.playbooks.console.draft, {
            tenantId,
            playbook: definition.key,
            utcOffsetMinutes: new Date().getTimezoneOffset(),
            choices,
            destination,
          })
          editorHost.editor.openDraftForm(automationFormValues(draft))
        } catch (error) {
          showErrorToast(error, "Couldn't open the automation.")
        }
      }),
  }
}

export function pendingActionKind(
  actions: PlaybookActions,
  definition: PlaybookDefinition
): PlaybookActionKind | undefined {
  return actions.pending?.key === definition.key
    ? actions.pending.kind
    : undefined
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
    enable: (
      definition: PlaybookDefinition,
      choices: PlaybookChoices,
      destination: DeliveryChoice
    ) =>
      pending.wrap(definition.key, "enable", async () => {
        try {
          await enableMutation({
            tenantId,
            playbook: definition.key,
            utcOffsetMinutes: new Date().getTimezoneOffset(),
            choices,
            destination,
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

    trial: (
      definition: PlaybookDefinition,
      choices: PlaybookChoices,
      destination: DeliveryChoice
    ) =>
      pending.wrap(definition.key, "trial", async () => {
        try {
          await trialMutation({
            tenantId,
            playbook: definition.key,
            choices,
            destination,
          })
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
