import { lazy, type ReactNode, Suspense } from "react"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { usePreloadSiblings } from "../cache/preload"
import { type FileSiblings } from "../siblings"
import { FileCopy, FileMeta, FileToolbar } from "../toolbar"
import { type FileDetail } from "../types"
import { useAutosave } from "./autosave"
import { type FileDocument, useDocument } from "./document"

/** CodeMirror loads only when a text file is actually on screen, keeping
 *  it out of the main bundle and the server build. */
const Mirror = lazy(() =>
  import("@/shared/console/mirror/view").then((module) => ({
    default: module.Mirror,
  }))
)

/** How the editor's buffer is persisted: the whole text, answering
 *  whether it landed. A false keeps the buffer and retries. */
export type FileSave = (text: string) => Promise<boolean>

/** In-place editor for a text file: the content fills the page under the
 *  toolbar, and edits save automatically — debounced, wholesale, through
 *  `onSave`. Last write wins; files carry no version. */
export function FileEditor({
  errorFallback,
  file,
  onSave,
  siblings,
  tools,
  url,
}: {
  /** Rendered when the file's text cannot be fetched. */
  errorFallback: ReactNode
  file: FileDetail
  onSave: FileSave
  siblings: FileSiblings
  /** Extra toolbar tools slotted before Copy — the HTML view's toggle. */
  tools?: ReactNode
  url: string
}) {
  const document = useDocument(file, url)

  // The neighbors warm only once this file's text is on screen, so
  // preloading never competes with the view it serves.
  usePreloadSiblings(siblings, document.state.status === "ready")
  const autosave = useAutosave(async (text: string) => {
    const didSave = await onSave(text)

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
