import { type Doc, type Id } from "../../_generated/dataModel"
import { maxTreeDepth } from "../../folders/tree"

type Totals = { bytes: number; count: number }

/** Aggregate direct counters into the immediate children of the requested folder. */
export function rollup(
  buckets: Doc<"fileUsage">[],
  folders: Doc<"folders">[],
  folderId?: Id<"folders">,
  scopedIds?: Set<Id<"folders">>
) {
  const byId = new Map(folders.map((folder) => [folder._id, folder]))
  const totals = new Map<string, Totals>()
  const scope: Totals = { bytes: 0, count: 0 }
  for (const bucket of buckets) {
    if (
      bucket.key === "total" ||
      (scopedIds !== undefined &&
        (bucket.folderId === undefined || !scopedIds.has(bucket.folderId)))
    ) {
      continue
    }
    scope.bytes += bucket.bytes
    scope.count += bucket.count
    const key =
      bucket.folderId === folderId
        ? "unfiled"
        : childKey(byId, bucket.folderId, folderId)
    const previous = totals.get(key) ?? { bytes: 0, count: 0 }
    totals.set(key, {
      bytes: previous.bytes + bucket.bytes,
      count: previous.count + bucket.count,
    })
  }
  return { scope, totals }
}

function childKey(
  folders: Map<Id<"folders">, Doc<"folders">>,
  id?: Id<"folders">,
  parentId?: Id<"folders">
) {
  let folder = id === undefined ? undefined : folders.get(id)
  for (
    let depth = 0;
    folder?.parentId !== undefined &&
    folder.parentId !== parentId &&
    depth < maxTreeDepth;
    depth++
  ) {
    folder = folders.get(folder.parentId)
  }
  return folder?._id ?? "unfiled"
}
