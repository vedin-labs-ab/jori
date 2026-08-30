import { useMutation } from "convex/react"
import { lazy, type ReactNode, Suspense } from "react"
import { api } from "../../../../convex/_generated/api"
import { CopyButton } from "../../shared/copy"
import { ConsoleListLoading } from "../../shared/list/loading"
import { usePreloadSiblings } from "../cache/preload"
import { type FileSiblings } from "../siblings"
import { uploadToStorage } from "../storage"
import { FileToolbar } from "../toolbar"
import { type FileDetail } from "../types"
import { type SaveStatus, useAutosave } from "./autosave"
import { type FileDocument, useDocument } from "./document"

/** CodeMirror loads only when a text file is actually on screen, keeping
 *  it out of the main bundle and the server build. */
const Mirror = lazy(() =>
  import("./mirror").then((module) => ({ default: module.Mirror }))
)

/** In-place editor for a text file: the content fills the page under the
 *  toolbar, and edits save automatically — debounced, wholesale, as a new
 *  storage blob. Last write wins; files carry no version. */
export function FileEditor({
  errorFallback,
  file,
  meta,
  organizationId,
  siblings,
  url,
}: {
  /** Rendered when the file's text cannot be fetched. */
  errorFallback: ReactNode
  file: FileDetail
  meta: ReactNode
  organizationId: string
  siblings: FileSiblings
  url: string
}) {
  const document = useDocument(file, url)
  const save = useSave(file, organizationId)

  // The neighbors warm only once this file's text is on screen, so
  // preloading never competes with the view it serves.
  usePreloadSiblings(siblings, document.state.status === "ready")
  const autosave = useAutosave(async (text: string) => {
    const didSave = await save(text)

    if (didSave) {
      document.markSaved(text)
    }

    return didSave
  })

  return (
    <>
      {/* No arrow keys here — CodeMirror owns them for caret movement. */}
      <FileToolbar
        siblings={siblings}
        tools={
          document.state.status === "ready" ? (
            <EditorStatus
              savedText={document.state.saved}
              status={autosave.status}
            />
          ) : undefined
        }
      >
        {meta}
      </FileToolbar>
      <EditorBody
        document={document}
        errorFallback={errorFallback}
        file={file}
        onBlur={autosave.flush}
        onChange={(text) => {
          if (document.state.status === "ready") {
            autosave.change(text, text === document.state.saved)
          }
        }}
      />
    </>
  )
}

/** Label per save state. Idle renders an empty slot; the span's minimum
 *  width keeps the toolbar from shifting as saves come and go. */
const statusLabels: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save — retrying",
}

function EditorStatus({
  savedText,
  status,
}: {
  savedText: string
  status: SaveStatus
}) {
  return (
    <>
      <span
        aria-live="polite"
        className="min-w-12 whitespace-nowrap text-right text-muted-foreground text-xs"
      >
        {statusLabels[status]}
      </span>
      <CopyButton label="file text" value={async () => savedText} />
    </>
  )
}

function EditorBody({
  document,
  errorFallback,
  file,
  onBlur,
  onChange,
}: {
  document: FileDocument
  errorFallback: ReactNode
  file: FileDetail
  onBlur: () => void
  onChange: (text: string) => void
}) {
  if (document.state.status === "loading") {
    return <ConsoleListLoading />
  }

  if (document.state.status === "error") {
    return errorFallback
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<ConsoleListLoading />}>
        <Mirror
          mimeType={file.mimeType}
          name={file.name}
          onBlur={onBlur}
          onChange={onChange}
          value={document.state.seed}
        />
      </Suspense>
    </div>
  )
}

/** Uploads the buffer as a new storage blob and swaps it into the file.
 *  Failures report as false; the autosave loop keeps the buffer and
 *  retries. */
function useSave(file: FileDetail, organizationId: string) {
  const generateUploadUrl = useMutation(api.files.console.uploadUrl)
  const replaceFile = useMutation(api.files.console.replace)

  return async function save(text: string) {
    try {
      const storageId = await uploadToStorage(
        await generateUploadUrl({ organizationId }),
        new Blob([text], { type: file.mimeType })
      )

      await replaceFile({ organizationId, fileId: file.fileId, storageId })

      return true
    } catch {
      return false
    }
  }
}
