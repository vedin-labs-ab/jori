import { lazy, type ReactNode, Suspense, useEffect } from "react"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { type SaveState } from "@/shared/console/materials/save"
import { usePreloadSiblings } from "../cache/preload"
import { FileDock } from "../dock"
import { type FileSiblings } from "../siblings"
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

/** What the page's chrome needs from the editor: what the autosave is
 *  doing, for the file's name, and the text as last saved, for a copy.
 *  The text is absent until the file has loaded. */
export type FileEditorState = {
  saveStatus: SaveState
  savedText: string | undefined
}

/** In-place editor for a text file: the content fills the page under the
 *  breadcrumb, and edits save automatically — debounced, wholesale,
 *  through `onSave`. Last write wins; files carry no version. */
export function FileEditor({
  errorFallback,
  file,
  onSave,
  onState,
  siblings,
  url,
}: {
  /** Rendered when the file's text cannot be fetched. */
  errorFallback: ReactNode
  file: FileDetail
  onSave: FileSave
  /** Reports the editor's state as it changes, and withdraws it when the
   *  editor leaves the page. */
  onState: (state: FileEditorState | undefined) => void
  siblings: FileSiblings
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

  usePublishedState(onState, {
    saveStatus: autosave.status,
    savedText:
      document.state.status === "ready" ? document.state.saved : undefined,
  })

  return (
    <>
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
      {/* No arrow keys here — CodeMirror owns them for caret movement. */}
      <FileDock siblings={siblings} />
    </>
  )
}

/** Hands the page the editor's state as it changes, without making the
 *  editor re-render on its own report, and takes it back on unmount so
 *  a view without an editor carries no save signal. */
function usePublishedState(
  onState: (state: FileEditorState | undefined) => void,
  state: FileEditorState
) {
  const { saveStatus, savedText } = state

  useEffect(() => {
    onState({ saveStatus, savedText })
  }, [onState, saveStatus, savedText])

  useEffect(() => () => onState(undefined), [onState])
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
