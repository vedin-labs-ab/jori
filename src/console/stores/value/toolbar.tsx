import { type ReactNode } from "react"
import { countLabel } from "@/lib/count"
import { SeparatorDot } from "../../shared/dot"
import { ConsoleListToolbar } from "../../shared/list/frame"
import { SaveMeta } from "../../shared/materials/save"
import { StoreOwnerCell } from "../cells"
import { type StoreDetail } from "../types"
import { type ValueSaveStatus } from "./autosave"

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
  saveStatus?: ValueSaveStatus
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
  saveStatus?: ValueSaveStatus
  store: StoreDetail
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
      <div className="min-w-0 text-foreground">
        <StoreOwnerCell compact store={store} />
      </div>
      <SeparatorDot />
      <SaveMeta saveStatus={saveStatus} updatedAt={store.updatedAt} />
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
