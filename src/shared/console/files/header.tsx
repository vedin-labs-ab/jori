import { Download, Link2 } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../layout"

/** The file page's header: what the host adds first, then share, and the
 *  download when storage has a URL for the file. Everything about the
 *  file itself hangs off its name in the breadcrumb. */
export function FileHeaderActions({
  children,
  onShare,
  url,
}: {
  children?: ReactNode
  onShare: () => void
  url: string | null
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
      {url === null ? null : <FileDownloadButton compact url={url} />}
    </ConsoleHeaderActions>
  )
}

export function FileDownloadButton({
  compact = false,
  url,
}: {
  /** Collapses to an icon on small screens, for the shell header. */
  compact?: boolean
  url: string
}) {
  return (
    <Button
      aria-label="Download"
      asChild
      className={cn(compact && "max-sm:size-7 max-sm:px-0")}
      variant="outline"
    >
      <a href={url} rel="noreferrer" target="_blank">
        <Download />
        <span className={cn(compact && "max-sm:hidden")}>Download</span>
      </a>
    </Button>
  )
}
