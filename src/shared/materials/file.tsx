import { useQuery } from "convex/react"
import { Download, FileIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { api } from "../../../convex/_generated/api"
import { useShareExpired } from "./share"
import { ShareShell, ShareUnavailable } from "./shell"
import { formatFileSize } from "./size"

/** Views a file through a share link, without a signed-in session: metadata,
 *  an inline preview when the browser can show one, and a download. The
 *  storage URL is signed per read, so it stays fresh as long as the link. */
export function FileShareView({
  fileId,
  secret,
}: {
  fileId: string
  secret: string
}) {
  const file = useQuery(api.files.share.get, { fileId, secret })
  const isExpired = useShareExpired(file?.expiresAt)
  const openPath = `/files/${encodeURIComponent(fileId)}`

  if (file === undefined) {
    return <FullscreenSkeletonLoader aria-label="Loading file" />
  }

  if (file === null || isExpired) {
    return <ShareUnavailable openPath={openPath} />
  }

  return (
    <ShareShell name={file.name} openPath={openPath}>
      {file.description === undefined ? null : (
        <p className="text-muted-foreground text-sm">{file.description}</p>
      )}
      <p className="text-muted-foreground text-sm">
        {file.mimeType} · {formatFileSize(file.size)}
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

export function FilePreview({
  mimeType,
  name,
  url,
}: {
  mimeType: string
  name: string
  url: string | null
}) {
  if (url !== null && mimeType.startsWith("image/")) {
    return (
      <img
        alt={name}
        className="max-h-[70svh] w-fit max-w-full rounded-md border"
        src={url}
      />
    )
  }

  if (url !== null && mimeType === "application/pdf") {
    return (
      <iframe
        className="h-[70svh] w-full rounded-md border"
        src={url}
        title={name}
      />
    )
  }

  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 text-muted-foreground">
      <FileIcon className="size-6" />
      <p className="text-sm">No inline preview for this file type.</p>
    </div>
  )
}
