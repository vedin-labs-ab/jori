import {
  defaultVisibilityForIntegrations,
  type Visibility,
} from "@contracts/visibility"
import { localTimezone } from "../../../shared/time"
import {
  type Automation,
  type AutomationFormValues,
  emptyAutomationForm,
} from "../../types"
import { readAutomationPreferences } from "../preferences"
import { triggerFormValues } from "./trigger"

/** The form's read direction. Deliberately free of the markdown codec, so
 *  pages can open the editor host without loading the editor itself. */
export function automationFormValues(
  automation: Automation | undefined
): AutomationFormValues {
  if (automation === undefined) {
    const values = {
      ...emptyAutomationForm,
      timezone: localTimezone(),
      ...readAutomationPreferences(),
    }

    const visibility = defaultVisibilityForIntegrations(
      values.surfaces.map((surface) => surface.integration)
    )

    return { ...values, visibility, scope: derivedScope(visibility) }
  }

  return {
    name: automation.name,
    instructions: automation.instructions,
    ...triggerFormValues(automation),
    visibility: automation.visibility,
    scope: derivedScope(automation.visibility),
    folderId: null,
    webSearch: automation.access.webSearch,
    surfaces: automation.access.surfaces,
  }
}

/** The execution sharing a visibility implies: private automations run as
 *  their person, every shared mode as the organization. */
export function derivedScope(visibility: Visibility) {
  return visibility.mode === "private"
    ? ("personal" as const)
    : ("organization" as const)
}
