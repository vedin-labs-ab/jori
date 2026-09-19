import { useQuery } from "convex/react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { useAcrossEpochs, useUrlEpoch } from "@/shared/files/epoch"
import { fileKind } from "@/shared/files/kind"
import { formatFileSize } from "@/shared/files/size"
import { api } from "../../../convex/_generated/api"
import { useShareExpired } from "./link"
import { FilePreview } from "./preview"
import { ShareShell, ShareUnavailable } from "./shell"

/** Views a file through a share link, without a signed-in session: metadata,
 *  an inline preview when the browser can show one, and a download. The
 *  storage URL is signed per read, so it stays fresh as long as the link. */
export function FileShareView({
  fileId,
  secret,
}: {
  fileId: string
  secret: string | null
}) {
  const epoch = useUrlEpoch()
  const file = useAcrossEpochs(
    useQuery(api.files.share.get, {
      fileId,
      secret: secret ?? undefined,
      epoch,
    }),
    fileId
  )
  const isExpired = useShareExpired(file?.expiresAt)
  const openPath = `/files/${encodeURIComponent(fileId)}`

  if (file === undefined) {
    return <ConsoleListLoading label="Loading file" />
  }

  if (file === null || isExpired) {
    return <ShareUnavailable openPath={openPath} />
  }

  return (
    <ShareShell name={file.name} openPath={openPath}>
      <p className="text-muted-foreground text-sm" title={file.mimeType}>
        {fileKind(file.mimeType, file.name).label} · {formatFileSize(file.size)}
      </p>
      <FilePreview mimeType={file.mimeType} name={file.name} url={file.url} />
      {file.url === null ? null : (
        <div>
          <Button asChild variant="outline">
            <a href={file.url} rel="noreferrer" target="_blank">
              <Download />
              Download
            </a>
          </Button>
        </div>
      )}
    </ShareShell>
  )
}
