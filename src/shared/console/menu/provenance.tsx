import { type MaterialOwner, MaterialOwnerCell } from "../materials/cells/owner"
import { absoluteTime, relativeTime, useNow } from "../time"

/** The shared owner and freshness section at the start of a title menu.
 *  Informational only, with the same inset as the actions below it. */
export function MenuProvenance({
  detail,
  owner,
  updatedAt,
}: {
  detail?: string
  owner: MaterialOwner
  updatedAt: number
}) {
  const now = useNow(30_000)

  return (
    <div className="grid gap-1 px-2 py-1.5 text-muted-foreground text-xs">
      <div className="font-medium text-foreground">
        <MaterialOwnerCell compact owner={owner} />
      </div>
      <span className="tabular-nums" title={absoluteTime(updatedAt)}>
        Updated {relativeTime(updatedAt, now)}
        {detail === undefined ? null : ` · ${detail}`}
      </span>
    </div>
  )
}
