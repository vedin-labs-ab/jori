import { Download, Link2, Loader2 } from "lucide-react"
import { type ReactNode } from "react"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../../layout"

/** A material page's header keeps only the primary actions; everything
 *  about the material itself hangs off its name in the breadcrumb. What
 *  the host adds — the way into a chat about the material — leads them. */
export function MaterialHeaderActions({
  canExport = true,
  children,
  isExporting = false,
  onExport,
  onShare,
}: {
  /** False while there is nothing to export yet, e.g. a never-written store. */
  canExport?: boolean
  children?: ReactNode
  isExporting?: boolean
  onExport: () => void
  onShare: () => void
}) {
  return (
    <ConsoleHeaderActions>
      {children}
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
