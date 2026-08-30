import { Check } from "lucide-react"
import { type ReactNode } from "react"
import { Spinner } from "@/components/ui/spinner"
import { countLabel } from "@/lib/count"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../../shared/dot"
import { ConsoleListToolbar } from "../../shared/list/frame"
import { absoluteTime, relativeTime, useNow } from "../../shared/time"
import { StoreOwnerCell } from "../cells"
import { type StoreDetail } from "../types"

/** Secondary header under the console breadcrumb, in the file toolbar's
 *  idiom: quiet store meta on the left, the value tools on the right. It
 *  stays mounted across view and edit, so switching modes never reflows
 *  the header. */
export function StoreToolbar({
  saveStatus,
  store,
  tools,
}: {
  /** The value editor's autosave state: shimmers the Updated label while
   *  a save is in flight and surfaces a brief check once it lands. */
  saveStatus?: "idle" | "saving" | "saved" | "error"
  store: StoreDetail
  tools: ReactNode
}) {
  return (
    <ConsoleListToolbar className="flex-nowrap gap-x-3 py-2">
      <div className="flex min-h-7 min-w-0 flex-1 items-center">
        <StoreMeta saveStatus={saveStatus} store={store} />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{tools}</div>
    </ConsoleListToolbar>
  )
}

/** The toolbar's metadata line, provenance first: who the store belongs
 *  to, how fresh the value is, and which version it is at — v0 honestly
 *  means the store has never been written. The owner's name sits in the
 *  foreground while the rest stays muted. */
function StoreMeta({
  saveStatus,
  store,
}: {
  saveStatus?: "idle" | "saving" | "saved" | "error"
  store: StoreDetail
}) {
  const now = useNow(30_000)
  const isSaving = saveStatus === "saving" || saveStatus === "error"

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
      <div className="min-w-0 text-foreground">
        <StoreOwnerCell compact store={store} />
      </div>
      <SeparatorDot />
      <span
        className={cn("shrink-0", isSaving && "shimmer")}
        title={
          saveStatus === "error"
            ? "Couldn't save yet — retrying."
            : absoluteTime(store.updatedAt)
        }
      >
        Updated {relativeTime(store.updatedAt, now)}
      </span>
      {saveStatus === undefined ? null : (
        <>
          <span
            aria-hidden
            className={cn(
              "flex shrink-0 items-center overflow-hidden transition-all duration-300",
              saveStatus === "idle"
                ? "-ml-1.5 max-w-0 scale-50 opacity-0"
                : "max-w-4 scale-100 opacity-100"
            )}
          >
            {saveStatus === "saved" ? (
              <Check className="size-3 text-success" />
            ) : (
              <Spinner className="size-3" />
            )}
          </span>
          <span aria-live="polite" className="sr-only">
            {saveStatus === "saved" ? "Saved" : ""}
          </span>
        </>
      )}
      <SeparatorDot className="max-sm:hidden" />
      <span
        className="shrink-0 max-sm:hidden"
        title={countLabel(store.version, "write")}
      >
        v{store.version}
      </span>
    </div>
  )
}
