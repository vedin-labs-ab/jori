import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { Download, Link2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/size"
import { cn } from "@/lib/utils"
import { fileKind, isHtmlFile, previewKind } from "@/shared/files/kind"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
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
import { textSizeLimit, usePreloadSiblings } from "./cache/preload"
import { FileEditor } from "./editor/section"
import { FileLinksDialog } from "./share"
import { type FileSiblings, useFileSiblings, useSiblingKeys } from "./siblings"
import { FileMeta, FileToolbar } from "./toolbar"
import { type FileDetail } from "./types"
import { FileHtml } from "./viewer/html"
import { FileViewer } from "./viewer/section"

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
  const files = useQuery(api.files.console.list, { organizationId })

  if (result === undefined) {
    // While the detail query resolves — every prev/next navigation starts
    // here — the file's row from the already-subscribed list carries the
    // same shape, so the page renders immediately and the resolved detail
    // replaces it without a visible swap. Only a cold direct visit waits.
    const row = files?.find((candidate) => candidate.fileId === fileId)

    if (row !== undefined) {
      return <FileReadyView file={row} organizationId={organizationId} />
    }

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
  useMaterialBreadcrumb(file.name)

  const siblings = useFileSiblings(organizationId, file.fileId)
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
      <FileBody
        file={file}
        organizationId={organizationId}
        siblings={siblings}
      />
      <FileLinksDialog
        fileId={file.fileId}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        organizationId={organizationId}
      />
    </ConsoleListLayout>
  )
}

/** Routes the page body by what the file is: an editor for text, the
 *  inline viewer for media, and a download prompt for the rest. */
function FileBody({
  file,
  organizationId,
  siblings,
}: {
  file: FileDetail
  organizationId: string
  siblings: FileSiblings
}) {
  const kind = previewKind(file.mimeType, file.name)

  if (kind === "text" && file.url !== null && file.size <= textSizeLimit) {
    return (
      <FileTextBody
        file={file}
        organizationId={organizationId}
        siblings={siblings}
        url={file.url}
      />
    )
  }

  if (kind !== "text" && kind !== "none" && file.url !== null) {
    return (
      <FileViewer
        key={file.fileId}
        file={file}
        kind={kind}
        meta={<FileMeta file={file} />}
        siblings={siblings}
        url={file.url}
      />
    )
  }

  return (
    <FileFallbackBody
      file={file}
      isOversizedText={kind === "text"}
      siblings={siblings}
    />
  )
}

/** Text files open in the autosaving editor — except HTML, which opens
 *  rendered with the same editor behind its Code toggle. Both mount keyed
 *  by file id, so navigating text-to-text unmounts the old editor and its
 *  autosave loop flushes the pending draft against the old file instead
 *  of carrying it into the next one. */
function FileTextBody({
  file,
  organizationId,
  siblings,
  url,
}: {
  file: FileDetail
  organizationId: string
  siblings: FileSiblings
  url: string
}) {
  const errorFallback = (
    <FileFallback
      description="Could not load the file's text. Download it instead."
      file={file}
      title="Could not load file"
    />
  )
  const Body = isHtmlFile(file.mimeType, file.name) ? FileHtml : FileEditor

  return (
    <Body
      key={file.fileId}
      errorFallback={errorFallback}
      file={file}
      organizationId={organizationId}
      siblings={siblings}
      url={url}
    />
  )
}

/** Download prompt under the toolbar for files with no inline view — and
 *  for text files too large to edit in place. Nothing here owns the arrow
 *  keys, so ←/→ navigate between files. */
function FileFallbackBody({
  file,
  isOversizedText,
  siblings,
}: {
  file: FileDetail
  isOversizedText: boolean
  siblings: FileSiblings
}) {
  useSiblingKeys(siblings)
  // No content to wait for here, so the neighbors warm right away.
  usePreloadSiblings(siblings, true)

  return (
    <>
      <FileToolbar hasArrowKeys siblings={siblings}>
        <FileMeta file={file} />
      </FileToolbar>
      {isOversizedText ? (
        <FileFallback
          description={`Files over ${formatFileSize(textSizeLimit)} skip the inline editor. Download the file to work on it.`}
          file={file}
          title="Too large to edit here"
        />
      ) : (
        <FileFallback
          description="No inline view for this file type. Download it to open it locally."
          file={file}
          title="No inline view"
        />
      )}
    </>
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
