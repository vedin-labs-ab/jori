import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { AskJoriAction } from "@/shared/console/chat/pane/ask"
import { FileBody } from "@/shared/console/files/body"
import { FileHeaderActions } from "@/shared/console/files/header"
import { type FileDetail } from "@/shared/console/files/types"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { MaterialPlaceholder } from "@/shared/console/materials/detail/placeholder"
import { useMemberUrl } from "@/shared/console/materials/fragment"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { useFileActions } from "./manage"
import { useFileSave } from "./save"
import { FileLinksDialog } from "./share"
import { useFileSiblings } from "./siblings"
import { type FileDialog, FileDialogs, FileTitleMenu } from "./title"

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

    return <MaterialPlaceholder noun="file" status="loading" />
  }

  if (result.status === "not_found" || result.file === null) {
    return (
      <MaterialPlaceholder fallback={fallback} noun="file" status="not_found" />
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

  const navigate = useNavigate()
  const siblings = useFileSiblings(organizationId, file.fileId)
  const save = useFileSave(organizationId, file)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [dialog, setDialog] = useState<FileDialog>()
  const actions = useFileActions(organizationId, {
    onDeleted: () => void navigate({ to: "/files" }),
    onSaved: () => setDialog(undefined),
  })
  const isPending = actions.pendingFileId === file.fileId

  // The view publishes the crumb itself, since its own lines lead the menu.
  const titleMenu = (lead: ReactNode) => (
    <FileTitleMenu
      file={file}
      isPending={isPending}
      lead={lead}
      onDelete={() => actions.deleteFile(file)}
      onOpen={setDialog}
    />
  )

  return (
    <ConsoleListLayout>
      <FileHeaderActions onShare={() => setIsShareOpen(true)} url={file.url}>
        <AskJoriAction target={{ kind: "file", id: file.fileId }} />
      </FileHeaderActions>
      <FileBody
        file={file}
        onSave={save}
        siblings={siblings}
        titleMenu={titleMenu}
      />
      <FileLinksDialog
        fileId={file.fileId}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        organizationId={organizationId}
      />
      <FileDialogs
        dialog={dialog}
        file={file}
        isSaving={isPending}
        onClose={() => setDialog(undefined)}
        onSave={actions.saveFile}
        organizationId={organizationId}
      />
    </ConsoleListLayout>
  )
}
