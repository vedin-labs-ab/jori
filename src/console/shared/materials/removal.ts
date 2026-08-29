import { useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "../error"
import { type SelectionRemoval } from "../list/bar"

type RemovalTarget = { name: string; archivedAt?: number }

type MaterialNoun = { plural: string; singular: string }

/** How a bulk removal presents, mirroring the per-row rules: an all-active
 *  selection archives, while any archived material makes the step a
 *  permanent delete. */
export function bulkMaterialRemoval(
  rows: { archivedAt?: number }[],
  noun: MaterialNoun,
  deleteDescription: string
): SelectionRemoval {
  const archived = rows.filter((row) => row.archivedAt !== undefined).length

  if (archived === 0) {
    return {
      description: `This removes the ${noun.plural} from the active list and blocks writes until they are restored.`,
      isDestructive: false,
      label: "Archive",
    }
  }

  return {
    description:
      archived === rows.length
        ? deleteDescription
        : `${deleteDescription} Active ${noun.plural} are archived instead.`,
    isDestructive: true,
    label: "Delete",
  }
}

/** Success toast for a bulk removal, naming what actually happened to the
 *  mix of active and archived materials. */
export function bulkMaterialRemovalSuccess(
  rows: { archivedAt?: number }[],
  noun: MaterialNoun
) {
  const deleted = rows.filter((row) => row.archivedAt !== undefined).length
  const archived = rows.length - deleted
  const name = (count: number) =>
    `${count} ${count === 1 ? noun.singular : noun.plural}`

  if (deleted === 0) {
    return `Archived ${name(archived)}.`
  }

  if (archived === 0) {
    return `Deleted ${name(deleted)}.`
  }

  return `Archived ${name(archived)} and deleted ${name(deleted)}.`
}

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
