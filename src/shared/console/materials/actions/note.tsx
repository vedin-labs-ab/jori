import { absoluteTime, relativeTime, useNow } from "../../time"
import { type MaterialOwner, MaterialOwnerCell } from "../cells/owner"

/** Provenance as a material menu's first lines, the way a second header
 *  used to read it: the owner in the foreground, then how fresh the
 *  material is and one detail of its own — a store's version, a file's
 *  size. Shown rather than offered: no hover, no focus, no selection —
 *  and set on the items' own inset so the text lines up with their
 *  labels. */
export function MenuProvenance({
  detail,
  owner,
  updatedAt,
}: {
  detail: string
  owner: MaterialOwner
  updatedAt: number
}) {
  const now = useNow(30_000)

  return (
    <div className="grid gap-0.5 px-2 py-1.5 text-muted-foreground text-xs">
      <div className="font-medium text-foreground">
        <MaterialOwnerCell compact owner={owner} />
      </div>
      <span className="tabular-nums" title={absoluteTime(updatedAt)}>
        Updated {relativeTime(updatedAt, now)} · {detail}
      </span>
    </div>
  )
}
