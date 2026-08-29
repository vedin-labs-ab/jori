import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { Download, Link2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fileKind, previewKind } from "@/shared/files/kind"
import { FilePreview } from "@/shared/materials/preview"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { SeparatorDot } from "../shared/dot"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsolePageLayout,
} from "../shared/layout"
import { ConsoleEmptyState } from "../shared/list/empty"
import { ConsoleListContent, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListLoading } from "../shared/list/loading"
import { useMaterialBreadcrumb } from "../shared/materials/breadcrumb"
import { useMemberUrl } from "../shared/materials/fragment"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
import { FileOwnerCell, FileTypeCell } from "./cells"
import { FileEditor, FileToolbar } from "./editor/section"
import { FileLinksDialog } from "./share"
import { type FileDetail, formatFileSize } from "./types"

/** Text files past this size skip the inline editor; the download covers
 *  them. */
const textSizeLimit = 1024 * 1024

/** Member view of one file: a secondary header with the file's metadata,
 *  and the content itself filling the rest of the page — media inline, text
 *  in an editor, and a download prompt for everything else. The share fork
 *  wraps exactly this component; a visitor holding a share secret who
 *  cannot see the file falls back to the share view. */
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
        <ConsoleListLoading />
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
  useMaterialBreadcrumb(file.name, file.scope)

  const [isShareOpen, setIsShareOpen] = useState(false)

  return (
    <ConsoleListLayout>
      <ConsoleHeaderActions>
        <ConsoleHeaderButton
          icon={<Link2 />}
          label="Share"
          onClick={() => setIsShareOpen(true)}
          type="button"
          variant="outline"
        />
        {file.url === null ? null : (
          <FileDownloadButton compact url={file.url} />
        )}
      </ConsoleHeaderActions>
      <FileBody file={file} organizationId={organizationId} />
      <FileLinksDialog
        fileId={file.fileId}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        organizationId={organizationId}
      />
    </ConsoleListLayout>
  )
}

/** Routes the page body by what the file is: an editor for text, inline
 *  media edge-to-edge, and a download prompt for the rest. */
function FileBody({
  file,
  organizationId,
}: {
  file: FileDetail
  organizationId: string
}) {
  const kind = previewKind(file.mimeType, file.name)

  if (kind === "text" && file.url !== null && file.size <= textSizeLimit) {
    return (
      <FileEditor
        errorFallback={
          <FileFallback
            description="Could not load the file's text. Download it instead."
            file={file}
            title="Could not load file"
          />
        }
        file={file}
        meta={<FileMeta file={file} />}
        organizationId={organizationId}
        url={file.url}
      />
    )
  }

  return (
    <>
      <FileToolbar>
        <FileMeta file={file} />
      </FileToolbar>
      <FileMediaBody file={file} kind={kind} />
    </>
  )
}

function FileMediaBody({
  file,
  kind,
}: {
  file: FileDetail
  kind: ReturnType<typeof previewKind>
}) {
  if (kind === "text") {
    return (
      <FileFallback
        description={`Files over ${formatFileSize(textSizeLimit)} skip the inline editor. Download the file to work on it.`}
        file={file}
        title="Too large to edit here"
      />
    )
  }

  if (file.url === null || kind === "none") {
    return (
      <FileFallback
        description="No inline view for this file type. Download it to open it locally."
        file={file}
        title="No inline view"
      />
    )
  }

  return (
    <div className="min-h-0 flex-1">
      <FilePreview
        mimeType={file.mimeType}
        name={file.name}
        url={file.url}
        variant="full"
      />
    </div>
  )
}

/** The secondary header's metadata line: kind, size, owner, and freshness,
 *  separated by the console's inline-meta middots. */
function FileMeta({ file }: { file: FileDetail }) {
  const now = useNow(30_000)

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
      <FileTypeCell file={file} />
      <SeparatorDot />
      <span className="shrink-0">{formatFileSize(file.size)}</span>
      <SeparatorDot />
      <FileOwnerCell compact file={file} />
      <SeparatorDot className="max-sm:hidden" />
      <span
        className="shrink-0 max-sm:hidden"
        title={absoluteTime(file.updatedAt)}
      >
        Updated {relativeTime(file.updatedAt, now)}
      </span>
    </div>
  )
}

function FileFallback({
  description,
  file,
  title,
}: {
  description: string
  file: FileDetail
  title: string
}) {
  return (
    <ConsoleListContent className="justify-center">
      <ConsoleEmptyState
        action={
          file.url === null ? undefined : <FileDownloadButton url={file.url} />
        }
        description={description}
        icon={fileKind(file.mimeType, file.name).icon}
        title={title}
      />
    </ConsoleListContent>
  )
}

function FileDownloadButton({
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
