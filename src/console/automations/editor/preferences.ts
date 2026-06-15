import { type AutomationFormValues, emptyAutomationForm } from "../types"

const webSearchKey = "milo.automation.webSearch"

export function readAutomationPreferences(): Pick<
  AutomationFormValues,
  "webSearch"
> {
  const storage = getStorage()

  if (storage === null) {
    return defaultAutomationPreferences()
  }

  return {
    webSearch: readAutomationWebSearchPreference(storage),
  }
}

export function writeAutomationWebSearchPreference(webSearch: boolean) {
  writeAutomationPreference(webSearchKey, String(webSearch))
}

function defaultAutomationPreferences() {
  return {
    webSearch: emptyAutomationForm.webSearch,
  }
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
