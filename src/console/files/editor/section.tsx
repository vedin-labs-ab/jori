import { useMutation } from "convex/react"
import {
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react"
import { api } from "../../../../convex/_generated/api"
import { CopyButton } from "../../shared/copy"
import { ConsoleListLoading } from "../../shared/list/loading"
import { uploadToStorage } from "../storage"
import { FileToolbar } from "../toolbar"
import { type FileDetail } from "../types"
import { type SaveStatus, useAutosave } from "./autosave"

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
  url,
}: {
  /** Rendered when the file's text cannot be fetched. */
  errorFallback: ReactNode
  file: FileDetail
  meta: ReactNode
  organizationId: string
  url: string
}) {
  const document = useDocument(file.fileId, url)
  const save = useSave(file, organizationId)
  const autosave = useAutosave(async (text: string) => {
    const didSave = await save(text)

    if (didSave) {
      document.markSaved(text)
    }

    return didSave
  })

  return (
    <>
      <FileToolbar
        action={
          <EditorStatus state={document.state} status={autosave.status} />
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
  state,
  status,
}: {
  state: DocumentState
  status: SaveStatus
}) {
  if (state.status !== "ready") {
    return null
  }

  return (
    <>
      <span
        aria-live="polite"
        className="min-w-12 whitespace-nowrap text-right text-muted-foreground text-xs"
      >
        {statusLabels[status]}
      </span>
      <CopyButton label="file text" value={async () => state.saved} />
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

type DocumentState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; saved: string; seed: string }

type FileDocument = ReturnType<typeof useDocument>

/** The file's text, fetched once per file. `saved` tracks the persisted
 *  content; `seed` is what the editor was seeded with and never moves, so
 *  saving never resets the caret. */
function useDocument(fileId: FileDetail["fileId"], url: string) {
  const [state, setState] = useState<DocumentState>({ status: "loading" })
  const loadedId = useRef<FileDetail["fileId"] | null>(null)

  useEffect(() => {
    // The signed url rotates with every query update, so a fetched file
    // never refetches — the editor already holds the freshest local text.
    if (loadedId.current === fileId) {
      return
    }

    loadedId.current = fileId
    setState({ status: "loading" })
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not fetch the file.")
        }

        return await response.text()
      })
      .then((text) => setState({ status: "ready", saved: text, seed: text }))
      .catch(() => setState({ status: "error" }))
  }, [fileId, url])

  function markSaved(text: string) {
    setState((current) =>
      current.status === "ready" ? { ...current, saved: text } : current
    )
  }

  return { markSaved, state }
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
