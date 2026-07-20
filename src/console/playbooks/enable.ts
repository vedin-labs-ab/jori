import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { type DeliveryChoice } from "@contracts/playbooks/delivery"
import { type PlaybookOptionValues } from "@contracts/playbooks/options"
import { useAction, useConvex } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { type AutomationEditorHost } from "../automations/editor/host"
import { automationFormValues } from "../automations/editor/save"
import { showErrorToast } from "../shared/error"
import {
  type AutomationId,
  type PlaybookChoices,
  useAutomationActions,
  useCatalogActions,
} from "./catalog"
import {
  type PendingAction,
  type PlaybookActionKind,
  usePendingAction,
} from "./pending"

export type { PlaybookActionKind } from "./pending"

export type PlaybookActions = ReturnType<typeof usePlaybookActions>

export function usePlaybookActions(
  organizationId: string,
  editorHost: AutomationEditorHost
) {
  const pending = usePendingAction()

  return {
    pending: pending.current,
    preloadEdit: editorHost.preloadDialog,
    ...useCatalogActions(organizationId, pending),
    ...useAutomationActions(organizationId, pending),
    ...useEditActions(organizationId, pending, editorHost),
  }
}

/** Opens the shared automation editor from a playbook — existing or draft. */
function useEditActions(
  organizationId: string,
  pending: PendingAction,
  editorHost: AutomationEditorHost
) {
  const convex = useConvex()
  const draftAction = useAction(api.playbooks.actions.draft)

  return {
    edit: (definition: PlaybookDefinition, automationId: AutomationId) =>
      pending.wrap(definition.key, "edit", async () => {
        editorHost.preloadDialog()
        try {
          const automation = await convex.query(api.automations.console.get, {
            organizationId,
            automationId,
          })
          editorHost.editor.openEditForm(automation)
        } catch (error) {
          showErrorToast(error, "Couldn't open the automation.")
        }
      }),

    // Stacks the builder on top of the caller's dialog; `onCreated` fires
    // once an automation is actually created from the draft.
    openAdvanced: (
      definition: PlaybookDefinition,
      choices: PlaybookChoices,
      destination: DeliveryChoice,
      options: PlaybookOptionValues,
      onCreated: () => void
    ) =>
      pending.wrap(definition.key, "advanced", async () => {
        try {
          const [, draft] = await Promise.all([
            editorHost.preloadDialog(),
            draftAction({
              organizationId,
              playbook: definition.key,
              choices,
              destination,
              options,
            }),
          ])
          editorHost.editor.openDraftForm(
            automationFormValues(draft),
            onCreated
          )
          // The first editor mount is slow (TipTap); hold the caller's
          // loading state until the builder is actually on screen.
          await editorHost.whenDialogReady()
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
