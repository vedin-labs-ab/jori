import { Braces, Copy } from "lucide-react"
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { copyText } from "@/shared/console/copy/text"
import { summaryOwner } from "@/shared/console/materials/owners"
import { MenuProvenance } from "@/shared/console/menu/provenance"
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
  onSchema,
  onViewChange,
  store,
  view,
}: {
  onSchema: () => void
  onViewChange?: (view: ValueEditorView) => void
  store: StoreDetail
  view?: ValueEditorView
}) {
  return (
    <>
      {/* v0 honestly means never written. */}
      <MenuProvenance
        detail={`v${store.version}`}
        owner={summaryOwner(store)}
        updatedAt={store.updatedAt}
      />
      {view === undefined || onViewChange === undefined ? null : (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(next) => onViewChange(next as ValueEditorView)}
            value={view}
          >
            <DropdownMenuRadioItem value="form">Form</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="code">Code</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onSchema}>
        <Braces />
        {store.schema === undefined ? "Add schema…" : "Schema…"}
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={store.version === 0}
        onSelect={() => void copyText(formatJsonText(store.value))}
      >
        <Copy />
        Copy value
      </DropdownMenuItem>
    </>
  )
}
