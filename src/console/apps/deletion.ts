import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { type AppSummary } from "./types"

export function useAppDeletion(organizationId: string) {
  const remove = useMutation(api.apps.console.remove)
  const restore = useMutation(api.apps.console.restore)
  const [deletingAppId, setDeletingAppId] = useState<string>()
  const [restoringAppId, setRestoringAppId] = useState<string>()

  async function deleteApp(app: AppSummary) {
    const fallback = app.archivedAt
      ? "Couldn't delete the app."
      : "Couldn't archive the app."

    setDeletingAppId(app.appId)
    try {
      await remove({ organizationId, appId: app.appId })
    } catch (error) {
      showErrorToast(error, fallback)
    } finally {
      setDeletingAppId(undefined)
    }
  }

  async function restoreApp(app: AppSummary) {
    setRestoringAppId(app.appId)
    try {
      await restore({ organizationId, appId: app.appId })
    } catch (error) {
      showErrorToast(error, "Couldn't restore the app.")
    } finally {
      setRestoringAppId(undefined)
    }
  }

  return {
    deleteApp,
    deletingAppId,
    restoreApp,
    restoringAppId,
  }
}
