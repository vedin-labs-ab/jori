import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { Download, Link2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { isTextualKind } from "@/shared/files/kind"
import { FilePreview } from "@/shared/materials/preview"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { CopyButton } from "../shared/copy"
import { DetailFrame } from "../shared/details"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsolePageLayout,
} from "../shared/layout"
import { ConsoleListSkeleton } from "../shared/list/skeleton"
import { useMaterialBreadcrumb } from "../shared/materials/breadcrumb"
import { useMemberUrl } from "../shared/materials/fragment"
import { FileOwnerCell, FileTypeCell } from "./cells"
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
  useMaterialBreadcrumb(file.name, file.scope)

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
      <DetailFrame
        action={<FileHeaderActions file={file} />}
        header={<FileMeta file={file} />}
      >
        <FilePreview
          mimeType={file.mimeType}
          name={file.name}
          url={file.url}
          variant="flush"
        />
      </DetailFrame>
      <FileLinksDialog
        fileId={file.fileId}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        organizationId={organizationId}
      />
    </ConsolePageLayout>
  )
}

/** The preview frame's header line, left side: type and size, separated by
 *  the same middot the console's inline meta rows use. */
function FileMeta({ file }: { file: FileDetail }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs">
      <FileTypeCell file={file} />
      <span aria-hidden>·</span>
      <span className="shrink-0">{formatFileSize(file.size)}</span>
    </div>
  )
}

/** The header's right edge: the owner, then a copy control for text-like
 *  files, in the store value terminal's action idiom. */
function FileHeaderActions({ file }: { file: FileDetail }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <FileOwnerCell compact file={file} />
      <FileCopyButton file={file} />
    </span>
  )
}

/** Files past this size skip the copy control; the download covers them. */
const copySizeLimit = 5_000_000

/** Copies the file's text. The inline preview caps what it fetches, so the
 *  button refetches the whole file on click — the clipboard never receives
 *  silently truncated content. */
function FileCopyButton({ file }: { file: FileDetail }) {
  const { url } = file

  if (
    url === null ||
    file.size > copySizeLimit ||
    !isTextualKind(file.mimeType, file.name)
  ) {
    return null
  }

  return <CopyButton label="file text" value={() => readFileText(url)} />
}

async function readFileText(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Could not fetch the file.")
  }

  return await response.text()
}
