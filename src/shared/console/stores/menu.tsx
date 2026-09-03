import { Braces, Copy } from "lucide-react"
import { type ReactNode } from "react"
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { copyText } from "@/shared/console/copy/text"
import { MaterialOwnerCell } from "@/shared/console/materials/cells/owner"
import { summaryOwner } from "@/shared/console/materials/owners"
import { absoluteTime, relativeTime, useNow } from "@/shared/console/time"
import { formatJsonText } from "./json"
import { type StoreDetail } from "./types"
import { type ValueEditorView } from "./value/state"

// What the store page's second header used to carry, as the lead of the
// menu the breadcrumb already hangs off the store's name: who it belongs
// to and how fresh it is, then the way the value is shown, then the tools
// that act on it.

/** The store's own items for its title menu: provenance, the view the
 *  value is read in, and its tools. `view` is absent for a store with no
 *  form to switch to, which leaves the group out rather than offering a
 *  choice of one. */
export function StoreMenuItems({
  onCopy,
  onSchema,
  onViewChange,
  store,
  view,
}: {
  onCopy?: () => void
  onSchema: () => void
  onViewChange?: (view: ValueEditorView) => void
  store: StoreDetail
  view?: ValueEditorView
}) {
  return (
    <>
      <StoreProvenance store={store} />
      <DropdownMenuSeparator />
      {view === undefined || onViewChange === undefined ? null : (
        <>
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(next) => onViewChange(next as ValueEditorView)}
            value={view}
          >
            <DropdownMenuRadioItem value="form">Form</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="code">Code</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem onSelect={onSchema}>
        <Braces />
        {store.schema === undefined ? "Add schema…" : "Schema…"}
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={store.version === 0}
        onSelect={onCopy ?? (() => void copyText(formatJsonText(store.value)))}
      >
        <Copy />
        Copy value
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  )
}

/** Provenance as the menu's first line, the way the toolbar read it:
 *  the owner in the foreground, then how fresh the value is and which
 *  version it stands at. v0 honestly means never written. */
function StoreProvenance({ store }: { store: StoreDetail }) {
  const now = useNow(30_000)

  return (
    <MenuNote>
      <div className="font-medium text-foreground">
        <MaterialOwnerCell compact owner={summaryOwner(store)} />
      </div>
      <span className="tabular-nums" title={absoluteTime(store.updatedAt)}>
        Updated {relativeTime(store.updatedAt, now)} · v{store.version}
      </span>
    </MenuNote>
  )
}

/** Lines the menu shows rather than offers: no hover, no focus, no
 *  selection. Set on the items' own inset so the text lines up with
 *  their labels. */
function MenuNote({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-0.5 px-2 py-1.5 text-muted-foreground text-xs">
      {children}
    </div>
  )
}
