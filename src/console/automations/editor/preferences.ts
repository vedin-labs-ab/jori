import { type AutomationReadScope } from "../surfaces"
import { type AutomationFormValues, emptyAutomationForm } from "../types"

const readScopeKey = "milo.automation.readScope"
const webSearchKey = "milo.automation.webSearch"

export function readAutomationPreferences(): Pick<
  AutomationFormValues,
  "readScope" | "webSearch"
> {
  const storage = getStorage()

  if (storage === null) {
    return defaultAutomationPreferences()
  }

  return {
    readScope: readAutomationReadScopePreference(storage),
    webSearch: readAutomationWebSearchPreference(storage),
  }
}

export function writeAutomationReadScopePreference(
  readScope: AutomationReadScope
) {
  writeAutomationPreference(readScopeKey, readScope)
}

export function writeAutomationWebSearchPreference(webSearch: boolean) {
  writeAutomationPreference(webSearchKey, String(webSearch))
}

function defaultAutomationPreferences() {
  return {
    readScope: emptyAutomationForm.readScope,
    webSearch: emptyAutomationForm.webSearch,
  }
}

function readAutomationReadScopePreference(
  storage: Storage
): AutomationReadScope {
  const value = storage.getItem(readScopeKey)

  return value === "selected" || value === "allConnected"
    ? value
    : emptyAutomationForm.readScope
}

function readAutomationWebSearchPreference(storage: Storage) {
  const value = storage.getItem(webSearchKey)

  if (value === "false") {
    return false
  }

  if (value === "true") {
    return true
  }

  return emptyAutomationForm.webSearch
}

function getStorage() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function writeAutomationPreference(key: string, value: string) {
  try {
    getStorage()?.setItem(key, value)
  } catch {
    return
  }
}
