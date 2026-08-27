import { useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "../error"

type RemovalTarget = { name: string; archivedAt?: number }

/** Archive, permanent delete, and restore for a material domain: one
 *  pending id keeps the busy row's actions quiet, removing an active
 *  material archives it, and removing an archived one deletes it. */
export function useMaterialRemoval<Target extends RemovalTarget>({
  identify,
  noun,
  remove,
  restore,
}: {
  identify: (target: Target) => string
  noun: string
  remove: (target: Target) => Promise<unknown>
  restore: (target: Target) => Promise<unknown>
}) {
  const [removingId, setRemovingId] = useState<string>()
  const [restoringId, setRestoringId] = useState<string>()

  async function removeMaterial(target: Target) {
    const isArchived = target.archivedAt !== undefined

    setRemovingId(identify(target))
    try {
      await remove(target)
      toast.success(
        isArchived ? `Deleted ${target.name}.` : `Archived ${target.name}.`
      )

      return true
    } catch (error) {
      showErrorToast(
        error,
        isArchived
          ? `Couldn't delete the ${noun}.`
          : `Couldn't archive the ${noun}.`
      )

      return false
    } finally {
      setRemovingId(undefined)
    }
  }

  async function restoreMaterial(target: Target) {
    setRestoringId(identify(target))
    try {
      await restore(target)
      toast.success(`Restored ${target.name}.`)

      return true
    } catch (error) {
      showErrorToast(error, `Couldn't restore the ${noun}.`)

      return false
    } finally {
      setRestoringId(undefined)
    }
  }

  return { removeMaterial, removingId, restoreMaterial, restoringId }
}
