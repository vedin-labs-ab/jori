import { Download, Link2, Loader2 } from "lucide-react"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../../layout"

/** A material page's header keeps only the primary actions; everything
 *  about the material itself hangs off its name in the breadcrumb. */
export function MaterialHeaderActions({
  canExport = true,
  isExporting = false,
  onExport,
  onShare,
}: {
  /** False while there is nothing to export yet, e.g. a never-written store. */
  canExport?: boolean
  isExporting?: boolean
  onExport: () => void
  onShare: () => void
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
        disabled={!canExport || isExporting}
        icon={isExporting ? <Loader2 className="animate-spin" /> : <Download />}
        label="Export"
        onClick={onExport}
        type="button"
        variant="outline"
      />
    </ConsoleHeaderActions>
  )
}
