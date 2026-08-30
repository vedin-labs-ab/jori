import { Download, Link2, Loader2 } from "lucide-react"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../../shared/layout"

/** The header keeps only the primary actions; everything about the table
 *  itself hangs off its name in the breadcrumb. */
export function TableHeaderActions({
  isExporting,
  onExport,
  onShare,
}: {
  isExporting: boolean
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
        disabled={isExporting}
        icon={isExporting ? <Loader2 className="animate-spin" /> : <Download />}
        label="Export"
        onClick={onExport}
        type="button"
        variant="outline"
      />
    </ConsoleHeaderActions>
  )
}
