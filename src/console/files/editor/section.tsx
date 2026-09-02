import { useMutation } from "convex/react"
import { lazy, type ReactNode, Suspense } from "react"
import { type FileDetail } from "@/shared/console/files/types"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { api } from "../../../../convex/_generated/api"
import { usePreloadSiblings } from "../cache/preload"
import { type FileSiblings } from "../siblings"
import { uploadToStorage } from "../storage"
import { FileCopy, FileMeta, FileToolbar } from "../toolbar"
import { useAutosave } from "./autosave"
import { type FileDocument, useDocument } from "./document"

/** CodeMirror loads only when a text file is actually on screen, keeping
 *  it out of the main bundle and the server build. */
const Mirror = lazy(() =>
  import("@/shared/console/mirror/view").then((module) => ({
    default: module.Mirror,
  }))
)

/** In-place editor for a text file: the content fills the page under the
 *  toolbar, and edits save automatically — debounced, wholesale, as a new
 *  storage blob. Last write wins; files carry no version. */
export function FileEditor({
  errorFallback,
  file,
  organizationId,
  siblings,
  tools,
  url,
}: {
  /** Rendered when the file's text cannot be fetched. */
  errorFallback: ReactNode
  file: FileDetail
  organizationId: string
  siblings: FileSiblings
  /** Extra toolbar tools slotted before Copy — the HTML view's toggle. */
  tools?: ReactNode
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
          <>
            {tools}
            <FileCopy
              file={file}
              savedText={
                document.state.status === "ready"
                  ? document.state.saved
                  : undefined
              }
              url={url}
            />
          </>
        }
      >
        <FileMeta file={file} saveStatus={autosave.status} />
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
