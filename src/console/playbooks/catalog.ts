import { type Integration } from "@contracts/integrations"
import {
  describePlaybookCadence,
  type PlaybookDefinition,
} from "@contracts/playbooks/catalog"
import { type DeliveryChoice } from "@contracts/playbooks/delivery"
import { type PlaybookOptionValues } from "@contracts/playbooks/options"
import { useNavigate } from "@tanstack/react-router"
import { useAction, useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { type PendingAction } from "./pending"

export type AutomationId = FunctionArgs<
  typeof api.automations.console.run
>["automationId"]

export type PlaybookChoices = Record<string, Integration>

type PlanInput = [
  definition: PlaybookDefinition,
  choices: PlaybookChoices,
  destination: DeliveryChoice,
  options: PlaybookOptionValues,
]

/** Enable, try, and reconfigure — the actions that submit a playbook plan. */
export function useCatalogActions(
  organizationId: string,
  pending: PendingAction
) {
  return {
    ...useEnableAction(organizationId, pending),
    ...useTrialAction(organizationId, pending),
    ...useReconfigureAction(organizationId, pending),
  }
}

function useEnableAction(organizationId: string, pending: PendingAction) {
  const enableMutation = useAction(api.playbooks.actions.enable)

  return {
    enable: (...[definition, choices, destination, options]: PlanInput) =>
      pending.wrap(definition.key, "enable", async () => {
        try {
          await enableMutation({
            organizationId,
            playbook: definition.key,
            choices,
            destination,
            options,
          })
          toast.success(`${definition.title} is on`, {
            description: cadenceDescription(definition, options),
          })
        } catch (error) {
          showErrorToast(error, "Couldn't enable the playbook.")
        }
      }),
  }
}

function useTrialAction(organizationId: string, pending: PendingAction) {
  const trialMutation = useAction(api.playbooks.actions.trial)
  const viewRuns = useViewRunsAction()

  return {
    trial: (...[definition, choices, destination, options]: PlanInput) =>
      pending.wrap(definition.key, "trial", async () => {
        try {
          await trialMutation({
            organizationId,
            playbook: definition.key,
            choices,
            destination,
            options,
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

function useReconfigureAction(organizationId: string, pending: PendingAction) {
  const reconfigureMutation = useAction(api.playbooks.actions.reconfigure)

  return {
    reconfigure: (
      definition: PlaybookDefinition,
      automationId: AutomationId,
      choices: PlaybookChoices,
      destination: DeliveryChoice,
      options: PlaybookOptionValues
    ) =>
      pending.wrap(definition.key, "reconfigure", async () => {
        try {
          await reconfigureMutation({
            organizationId,
            playbook: definition.key,
            automationId,
            choices,
            destination,
            options,
          })
          toast.success(`${definition.title} updated`, {
            description: cadenceDescription(definition, options),
          })
        } catch (error) {
          showErrorToast(error, "Couldn't update the playbook.")
        }
      }),
  }
}

/** Run-now and pause/resume for an enabled playbook's automation. */
export function useAutomationActions(
  organizationId: string,
  pending: PendingAction
) {
  const runMutation = useMutation(api.automations.console.run)
  const pauseMutation = useMutation(api.automations.console.pause)
  const resumeMutation = useMutation(api.automations.console.resume)
  const viewRuns = useViewRunsAction()

  return {
    runNow: (definition: PlaybookDefinition, automationId: AutomationId) =>
      pending.wrap(definition.key, "run", async () => {
        try {
          await runMutation({ organizationId, automationId })
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
            await pauseMutation({ organizationId, automationId })
            toast.success(`${definition.title} paused`, {
              description: "It keeps its setup — switch it back on anytime.",
            })
          } else {
            await resumeMutation({ organizationId, automationId })
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

function cadenceDescription(
  definition: PlaybookDefinition,
  options: PlaybookOptionValues
) {
  const cadence = describePlaybookCadence(definition, options)

  return `Runs ${cadence.charAt(0).toLowerCase()}${cadence.slice(1)}.`
}
