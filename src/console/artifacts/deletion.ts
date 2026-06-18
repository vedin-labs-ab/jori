import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { readErrorMessage } from "../shared/error"
import { type ArtifactSummary } from "./types"

export function useArtifactDeletion(tenantId: string) {
  const remove = useMutation(api.artifacts.console.remove)
  const restore = useMutation(api.artifacts.console.restore)
  const [deletingArtifactId, setDeletingArtifactId] = useState<string>()
  const [restoringArtifactId, setRestoringArtifactId] = useState<string>()
  const [deleteError, setDeleteError] = useState<string>()

  async function deleteArtifact(artifact: ArtifactSummary) {
    const fallback = artifact.archivedAt
      ? "Could not delete artifact."
      : "Could not archive artifact."

    setDeletingArtifactId(artifact.artifactId)
    setDeleteError(undefined)
    try {
      await remove({ tenantId, artifactId: artifact.artifactId })
    } catch (error) {
      setDeleteError(readErrorMessage(error, fallback))
    } finally {
      setDeletingArtifactId(undefined)
    }
  }

  async function restoreArtifact(artifact: ArtifactSummary) {
    setRestoringArtifactId(artifact.artifactId)
    setDeleteError(undefined)
    try {
      await restore({ tenantId, artifactId: artifact.artifactId })
    } catch (error) {
      setDeleteError(readErrorMessage(error, "Could not restore artifact."))
    } finally {
      setRestoringArtifactId(undefined)
    }
  }

  return {
    deleteArtifact,
    deleteError,
    deletingArtifactId,
    restoreArtifact,
    restoringArtifactId,
  }
}
