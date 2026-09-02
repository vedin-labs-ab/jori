import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileBody } from "@/shared/console/files/body"
import { FileHeaderActions } from "@/shared/console/files/header"
import { type FileDetail } from "@/shared/console/files/types"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { useMemberUrl } from "@/shared/console/materials/fragment"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { useFileSave } from "./save"
import { FileLinksDialog } from "./share"
import { useFileSiblings } from "./siblings"
import { FileTitleMenu } from "./title"

/** Member view of one file: the header actions, the file's body, and the
 *  dialogs, over the detail query. The share fork wraps exactly this
 *  component; a visitor holding a share secret who cannot see the file
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

  const siblings = useFileSiblings(organizationId, file.fileId)
  const save = useFileSave(organizationId, file)
  const [isShareOpen, setIsShareOpen] = useState(false)

  return (
    <ConsoleListLayout>
      <FileHeaderActions onShare={() => setIsShareOpen(true)} url={file.url} />
      <FileBody file={file} onSave={save} siblings={siblings} />
      <FileLinksDialog
        fileId={file.fileId}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        organizationId={organizationId}
      />
      <FileTitleMenu file={file} organizationId={organizationId} />
    </ConsoleListLayout>
  )
}
