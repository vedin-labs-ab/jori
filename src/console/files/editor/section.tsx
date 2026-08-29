import { useMutation } from "convex/react"
import { Loader2 } from "lucide-react"
import {
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "../../../../convex/_generated/api"
import { CopyButton } from "../../shared/copy"
import { showErrorToast } from "../../shared/error"
import { ConsoleListToolbar } from "../../shared/list/frame"
import { uploadToStorage } from "../storage"
import { type FileDetail } from "../types"

/** CodeMirror loads only when a text file is actually on screen, keeping
 *  it out of the main bundle and the server build. */
const Mirror = lazy(() =>
  import("./mirror").then((module) => ({ default: module.Mirror }))
)

/** Secondary header under the console breadcrumb: quiet file meta on the
 *  left, contextual actions on the right, constant height either way. */
export function FileToolbar({
  action,
  children,
}: {
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <ConsoleListToolbar className="flex-nowrap gap-x-3 py-2">
      <div className="flex min-h-7 min-w-0 flex-1 items-center">{children}</div>
      {action === undefined ? null : (
        <div className="flex shrink-0 items-center gap-1.5">{action}</div>
      )}
    </ConsoleListToolbar>
  )
}

/** In-place editor for a text file: the content fills the page under the
 *  toolbar, and edits save wholesale as a new storage blob. Last write
 *  wins; files carry no version. */
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
  const draft = useRef("")
  const [isDirty, setIsDirty] = useState(false)
  const save = useSave(file, organizationId)

  async function submit() {
    if (await save.submit(draft.current)) {
      document.markSaved(draft.current)
      setIsDirty(false)
    }
  }

  function discard() {
    draft.current =
      document.state.status === "ready" ? document.state.saved : ""
    setIsDirty(false)
    document.reseed()
  }

  return (
    <>
      <FileToolbar
        action={
          <EditorActions
            isDirty={isDirty}
            isSaving={save.isSaving}
            onDiscard={discard}
            onSave={() => void submit()}
            state={document.state}
          />
        }
      >
        {meta}
      </FileToolbar>
      <EditorBody
        document={document}
        errorFallback={errorFallback}
        file={file}
        onChange={(text) => {
          draft.current = text
          setIsDirty(
            document.state.status === "ready" && text !== document.state.saved
          )
        }}
      />
    </>
  )
}

function EditorActions({
  isDirty,
  isSaving,
  onDiscard,
  onSave,
  state,
}: {
  isDirty: boolean
  isSaving: boolean
  onDiscard: () => void
  onSave: () => void
  state: DocumentState
}) {
  if (state.status !== "ready") {
    return null
  }

  if (!isDirty) {
    return <CopyButton label="file text" value={async () => state.saved} />
  }

  return (
    <>
      <Button
        disabled={isSaving}
        onClick={onDiscard}
        type="button"
        variant="ghost"
      >
        Discard
      </Button>
      <Button disabled={isSaving} onClick={onSave} type="button">
        {isSaving ? <Loader2 className="animate-spin" /> : null}
        Save
      </Button>
    </>
  )
}

function EditorBody({
  document,
  errorFallback,
  file,
  onChange,
}: {
  document: FileDocument
  errorFallback: ReactNode
  file: FileDetail
  onChange: (text: string) => void
}) {
  if (document.state.status === "loading") {
    return <EditorLoading />
  }

  if (document.state.status === "error") {
    return errorFallback
  }

  return (
    <div className="min-h-0 flex-1">
      <Suspense fallback={<EditorLoading />}>
        <Mirror
          key={document.state.seedKey}
          mimeType={file.mimeType}
          name={file.name}
          onChange={onChange}
          value={document.state.seed}
        />
      </Suspense>
    </div>
  )
}

function EditorLoading() {
  return <div className="min-h-0 flex-1 animate-pulse bg-muted/20" />
}

type DocumentState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; saved: string; seed: string; seedKey: number }

type FileDocument = ReturnType<typeof useDocument>

/** The file's text, fetched once per file. `saved` tracks the persisted
 *  content; `seed` is what the editor was seeded with and only moves on
 *  discard, so saving never resets the caret. */
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
      .then((text) =>
        setState({ status: "ready", saved: text, seed: text, seedKey: 0 })
      )
      .catch(() => setState({ status: "error" }))
  }, [fileId, url])

  function markSaved(text: string) {
    setState((current) =>
      current.status === "ready" ? { ...current, saved: text } : current
    )
  }

  /** Reseeds the editor from the saved text, discarding local edits. */
  function reseed() {
    setState((current) =>
      current.status === "ready"
        ? { ...current, seed: current.saved, seedKey: current.seedKey + 1 }
        : current
    )
  }

  return { markSaved, reseed, state }
}

function useSave(file: FileDetail, organizationId: string) {
  const generateUploadUrl = useMutation(api.files.console.uploadUrl)
  const replaceFile = useMutation(api.files.console.replace)
  const [isSaving, setIsSaving] = useState(false)

  async function submit(text: string) {
    setIsSaving(true)

    try {
      const storageId = await uploadToStorage(
        await generateUploadUrl({ organizationId }),
        new Blob([text], { type: file.mimeType })
      )

      await replaceFile({ organizationId, fileId: file.fileId, storageId })
      toast.success(`Saved ${file.name}.`)

      return true
    } catch (error) {
      showErrorToast(error, "Could not save the file.")

      return false
    } finally {
      setIsSaving(false)
    }
  }

  return { isSaving, submit }
}
