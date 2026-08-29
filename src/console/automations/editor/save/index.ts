import { defaultScopeForIntegrations } from "@contracts/permissions/scope"
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

    return {
      ...values,
      scope: defaultScopeForIntegrations(
        values.surfaces.map((surface) => surface.integration)
      ),
    }
  }

  return {
    name: automation.name,
    instructions: automation.instructions,
    ...triggerFormValues(automation),
    scope: automation.scope,
    folderId: null,
    webSearch: automation.access.webSearch,
    surfaces: automation.access.surfaces,
  }
}
