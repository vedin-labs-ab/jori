import { emptyJobForm, type JobFormValues } from "@/shared/console/jobs/types"

const webSearchKey = "jori.job.webSearch"

export function readJobPreferences(): Pick<JobFormValues, "webSearch"> {
  const storage = getStorage()

  if (storage === null) {
    return defaultJobPreferences()
  }

  return {
    webSearch: readJobWebSearchPreference(storage),
  }
}

export function writeJobWebSearchPreference(webSearch: boolean) {
  writeJobPreference(webSearchKey, String(webSearch))
}

function defaultJobPreferences() {
  return {
    webSearch: emptyJobForm.webSearch,
  }
}

function readJobWebSearchPreference(storage: Storage) {
  const value = storage.getItem(webSearchKey)

  if (value === "false") {
    return false
  }

  if (value === "true") {
    return true
  }

  return emptyJobForm.webSearch
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

function writeJobPreference(key: string, value: string) {
  try {
    getStorage()?.setItem(key, value)
  } catch {
    return
  }
}
