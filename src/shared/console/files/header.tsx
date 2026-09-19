import { Download, Link2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { downloadUrl } from "@/shared/files/download"
import { showErrorToast } from "../error"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../layout"

/** The file page's header: what the host adds first, then share, and the
 *  download when storage has a URL for the file. Everything about the
 *  file itself hangs off its name in the breadcrumb. */
export function FileHeaderActions({
  children,
  name,
  onShare,
  url,
}: {
  children?: ReactNode
  name: string
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
      {url === null ? null : (
        <FileDownloadButton compact name={name} url={url} />
      )}
    </ConsoleHeaderActions>
  )
}

export function FileDownloadButton({
  compact = false,
  name,
  url,
}: {
  /** Collapses to an icon in a tight shell header. */
  compact?: boolean
  name: string
  url: string
}) {
  const [pending, setPending] = useState(false)
  async function download() {
    setPending(true)
    try {
      await downloadUrl(name, url)
    } catch (error) {
      showErrorToast(error, "Could not download the file.")
    } finally {
      setPending(false)
    }
  }
  return (
    <Button
      aria-label="Download"
      className={cn(compact && "@max-lg/inset:size-7 @max-lg/inset:px-0")}
      disabled={pending}
      onClick={() => void download()}
      type="button"
      variant="outline"
    >
      <Download />
      <span className={cn(compact && "@max-lg/inset:hidden")}>Download</span>
    </Button>
  )
}
