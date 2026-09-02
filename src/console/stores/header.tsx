import { Download, Link2 } from "lucide-react"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
} from "@/shared/console/layout"
import { type StoreDetail } from "@/shared/console/stores/types"

/** The header keeps only the primary actions; everything about the store
 *  itself hangs off its name in the breadcrumb. */
export function StoreHeaderActions({
  onExport,
  onShare,
  store,
}: {
  onExport: () => void
  onShare: () => void
  store: StoreDetail
}) {
  return (
    <ConsoleHeaderActions>
      <ConsoleHeaderButton
        icon={<Link2 />}
        label="Share"
        onClick={onShare}
        type="button"
        variant="outline"
      />
      <ConsoleHeaderButton
        disabled={store.version === 0}
        icon={<Download />}
        label="Export"
        onClick={onExport}
        type="button"
        variant="outline"
      />
    </ConsoleHeaderActions>
  )
}
