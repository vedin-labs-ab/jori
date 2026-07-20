import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { type ArtifactSummary } from "./types"

export function useArtifactDeletion(organizationId: string) {
  const remove = useMutation(api.artifacts.console.remove)
  const restore = useMutation(api.artifacts.console.restore)
  const [deletingArtifactId, setDeletingArtifactId] = useState<string>()
  const [restoringArtifactId, setRestoringArtifactId] = useState<string>()

  async function deleteArtifact(artifact: ArtifactSummary) {
    const fallback = artifact.archivedAt
      ? "Couldn't delete the artifact."
      : "Couldn't archive the artifact."

    setDeletingArtifactId(artifact.artifactId)
    try {
      await remove({ organizationId, artifactId: artifact.artifactId })
    } catch (error) {
      showErrorToast(error, fallback)
    } finally {
      setDeletingArtifactId(undefined)
    }
  }

  async function restoreArtifact(artifact: ArtifactSummary) {
    setRestoringArtifactId(artifact.artifactId)
    try {
      await restore({ organizationId, artifactId: artifact.artifactId })
    } catch (error) {
      showErrorToast(error, "Couldn't restore the artifact.")
    } finally {
      setRestoringArtifactId(undefined)
    }
  }

  return {
    deleteArtifact,
    deletingArtifactId,
    restoreArtifact,
    restoringArtifactId,
  }
}
