import { useSyncExternalStore } from "react"
import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { columnTier } from "../../list/controls"
import { absoluteTime, relativeTime, useNow } from "../../time"

const subscribe = () => () => undefined
const serverTitle = () => undefined

/** Localized titles wait for the browser; relative text uses the fixture's
 * initial clock during hydration and the live clock afterward. */
export function UpdatedCell({ at }: { at: number | undefined }) {
  const now = useNow(30_000)
  const title = useSyncExternalStore(
    subscribe,
    () => (at === undefined ? undefined : absoluteTime(at)),
    serverTitle
  )
  return (
    <TableCell
      className={cn("text-muted-foreground", columnTier.sm)}
      title={title}
    >
      {at === undefined ? "—" : relativeTime(Math.min(at, now), now)}
    </TableCell>
  )
}
