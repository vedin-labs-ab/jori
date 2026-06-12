import { type ScheduleReadScope } from "./surfaces"
import { emptyScheduleForm, type ScheduleFormValues } from "./types"

const readScopeKey = "milo.schedule.readScope"
const webSearchKey = "milo.schedule.webSearch"

export function readSchedulePreferences(): Pick<
  ScheduleFormValues,
  "readScope" | "webSearch"
> {
  const storage = getStorage()

  if (storage === null) {
    return defaultSchedulePreferences()
  }

  return {
    readScope: readScheduleReadScopePreference(storage),
    webSearch: readScheduleWebSearchPreference(storage),
  }
}

export function writeScheduleReadScopePreference(readScope: ScheduleReadScope) {
  writeSchedulePreference(readScopeKey, readScope)
}

export function writeScheduleWebSearchPreference(webSearch: boolean) {
  writeSchedulePreference(webSearchKey, String(webSearch))
}

function defaultSchedulePreferences() {
  return {
    readScope: emptyScheduleForm.readScope,
    webSearch: emptyScheduleForm.webSearch,
  }
}

function readScheduleReadScopePreference(storage: Storage): ScheduleReadScope {
  const value = storage.getItem(readScopeKey)

  return value === "selected" || value === "allConnected"
    ? value
    : emptyScheduleForm.readScope
}

function readScheduleWebSearchPreference(storage: Storage) {
  const value = storage.getItem(webSearchKey)

  if (value === "false") {
    return false
  }

  if (value === "true") {
    return true
  }

  return emptyScheduleForm.webSearch
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

function writeSchedulePreference(key: string, value: string) {
  try {
    getStorage()?.setItem(key, value)
  } catch {
    return
  }
}
