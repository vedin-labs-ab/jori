import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { Download, Link2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FilePreview } from "@/shared/materials/preview"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsolePageLayout,
} from "../shared/layout"
import { ConsoleListSkeleton } from "../shared/list/skeleton"
import { useMaterialBreadcrumb } from "../shared/materials/breadcrumb"
import { useMemberUrl } from "../shared/materials/fragment"
import { FileLinksDialog } from "./share"
import { formatFileSize } from "./types"

type FileDetail = NonNullable<
  NonNullable<ReturnType<typeof useQuery<typeof api.files.console.get>>>["file"]
>

/** Member view of one file: metadata, a preview when the browser can show
 *  one, a download, and share-link management. The share fork wraps exactly
 *  this component; a visitor holding a share secret who cannot see the file
 *  falls back to the share view. */
export function FileView({
  fallback,
  fileId,
}: {
  fallback?: ReactNode
  fileId: GenericId<"files">
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <FileViewContent
          fallback={fallback}
          fileId={fileId}
          organizationId={organizationId}
        />
      )}
    </ConsolePage>
  )
}

function FileViewContent({
  fallback,
  fileId,
  organizationId,
}: {
  fallback: ReactNode | undefined
  fileId: GenericId<"files">
  organizationId: string
}) {
  const result = useQuery(api.files.console.get, { organizationId, fileId })

  if (result === undefined) {
    return (
      <ConsolePageLayout>
        <ConsoleListSkeleton />
      </ConsolePageLayout>
    )
  }

  if (result.status === "not_found" || result.file === null) {
    return (
      fallback ?? (
        <ConsolePageLayout>
          <Alert>
            <AlertTitle>File not found</AlertTitle>
            <AlertDescription>
              The file may have been deleted or belongs to another organization.
            </AlertDescription>
          </Alert>
        </ConsolePageLayout>
      )
    )
  }

  return <FileReadyView file={result.file} organizationId={organizationId} />
}

function FileReadyView({
  file,
  organizationId,
}: {
  file: FileDetail
  organizationId: string
}) {
  useMemberUrl()
  useMaterialBreadcrumb(file.name)

  const [isShareOpen, setIsShareOpen] = useState(false)

  return (
    <ConsolePageLayout>
      <ConsoleHeaderActions>
        <ConsoleHeaderButton
          icon={<Link2 />}
          label="Share"
          onClick={() => setIsShareOpen(true)}
          type="button"
          variant="outline"
        />
        {file.url === null ? null : (
          <Button
            aria-label="Download"
            asChild
            className="max-sm:size-7 max-sm:px-0"
            variant="outline"
          >
            <a href={file.url} rel="noreferrer" target="_blank">
              <Download />
              <span className="max-sm:hidden">Download</span>
            </a>
          </Button>
        )}
      </ConsoleHeaderActions>
      <FileHeading file={file} />
      <FilePreview mimeType={file.mimeType} name={file.name} url={file.url} />
      <FileLinksDialog
        fileId={file.fileId}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        organizationId={organizationId}
      />
    </ConsolePageLayout>
  )
}

function FileHeading({ file }: { file: FileDetail }) {
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium text-lg tracking-tight">{file.name}</h2>
        <Badge variant={file.scope === "personal" ? "outline" : "secondary"}>
          {file.scope === "personal" ? "Personal" : "Organization"}
        </Badge>
      </div>
      {file.description === undefined ? null : (
        <p className="text-muted-foreground text-sm">{file.description}</p>
      )}
      <p className="text-muted-foreground text-xs">
        {file.mimeType} · {formatFileSize(file.size)} ·{" "}
        {file.source === "run" ? "Saved by Jori" : "Uploaded"}
      </p>
    </div>
  )
}
