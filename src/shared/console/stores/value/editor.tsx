import { type JsonSchemaObject } from "@contracts/schema/validate"
import { lazy, Suspense, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { FieldError } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import {
  conflictMessage,
  isVersionConflict,
} from "@/shared/console/materials/conflict"
import { type SaveState } from "@/shared/console/materials/save"
import { scrollFade } from "@/shared/fade"
import { type StoreDetail } from "../types"
import { useValueAutosave, type ValueSaveOutcome } from "./autosave"
import { ValueFields } from "./fields"
import { useValueEditor, type ValueEditor, type ValueEditorView } from "./state"

/** How the store's value is written: the whole value, against the
 *  version it was edited from. */
export type ValueWrite = (
  value: unknown,
  expectedVersion: number
) => Promise<unknown>

/** CodeMirror loads only once the code view is on screen, keeping it out
 *  of the console bundle and the server build. */
const Mirror = lazy(() =>
  import("@/shared/console/mirror/view").then((module) => ({
    default: module.Mirror,
  }))
)

/** The store value editor is the page: a schema-driven form (with the
 *  JSON mirrored one view away) that saves itself — debounced, validated
 *  first, wholesale against the version it last saw. There is nothing to
 *  press; the page hangs the view choice and the save signal off the
 *  store's name in the breadcrumb. */
export function ValueEditorSection({
  onState,
  onWrite,
  schema,
  store,
}: {
  /** The view the value is in, how to change it, and what the autosave is
   *  doing, for the page's own chrome. */
  onState: (state: ValueEditorState) => void
  /** Writes the value wholesale against the version the editor last saw;
   *  a rejection that is a version conflict reseeds from upstream. */
  onWrite: ValueWrite
  /** The store's schema, which the form is built from — the editor only
   *  renders for a store that has one. */
  schema: JsonSchemaObject
  store: StoreDetail
}) {
  const editor = useValueEditor({
    hasValue: store.version > 0,
    schema,
    value: store.value,
  })
  const versionRef = useRef(store.version)
  const lastSavedRef = useRef(JSON.stringify(store.value) ?? "")

  const performRef = useRef<() => Promise<ValueSaveOutcome>>(
    async () => "invalid"
  )

  performRef.current = () =>
    saveValue({ editor, lastSavedRef, onWrite, versionRef })

  const autosave = useValueAutosave(() => performRef.current())

  useExternalReseed(store, editor, versionRef, lastSavedRef, autosave.isBusy)
  usePublishedState(onState, {
    saveStatus: autosave.status,
    switchView: useStable(editor.switchView),
    view: editor.form === undefined ? undefined : editor.state.view,
  })

  return <ValueBody editor={editor} onEdit={autosave.change} />
}

/** What the page's chrome needs from the editor. A store whose form the
 *  widgets cannot build has no view to choose, so it reports none. */
export type ValueEditorState = {
  saveStatus: SaveState
  switchView: (view: ValueEditorView) => void
  view?: ValueEditorView
}

/** One identity for a function the editor rebuilds every render, so the
 *  page gets a report only when the state it carries changes. */
function useStable<Arguments extends unknown[]>(
  callback: (...args: Arguments) => void
) {
  const ref = useRef(callback)

  ref.current = callback

  return useCallback((...args: Arguments) => ref.current(...args), [])
}

/** Hands the page the editor's state as it changes, without making the
 *  editor re-render on its own report. */
function usePublishedState(
  onState: (state: ValueEditorState) => void,
  state: ValueEditorState
) {
  const { saveStatus, switchView, view } = state

  useEffect(() => {
    onState({ saveStatus, switchView, view })
  }, [onState, saveStatus, switchView, view])
}

/** One save attempt: validate, skip a buffer already at the saved value —
 *  an edit typed and reverted must not burn a version — then write
 *  wholesale against the version last seen. Writes bump the version by
 *  one; tracking it locally keeps rapid follow-up saves ahead of the
 *  subscription's round-trip. */
async function saveValue({
  editor,
  lastSavedRef,
  onWrite,
  versionRef,
}: {
  editor: ValueEditor
  lastSavedRef: { current: string }
  onWrite: ValueWrite
  versionRef: { current: number }
}): Promise<ValueSaveOutcome> {
  const result = editor.submit()

  if (!result.ok) {
    return "invalid"
  }

  const serialized = JSON.stringify(result.value) ?? ""

  if (serialized === lastSavedRef.current) {
    return "saved"
  }

  try {
    await onWrite(result.value, versionRef.current)
    versionRef.current += 1
    lastSavedRef.current = serialized

    return "saved"
  } catch (error) {
    if (isVersionConflict(error)) {
      toast.error(conflictMessage("store value"))

      return "conflict"
    }

    throw error
  }
}

/** A write that landed elsewhere — another tab, an agent — reseeds the
 *  editor, but only while nothing local is typed or in flight; local work
 *  is never clobbered, it just wins or conflicts on its own save. */
function useExternalReseed(
  store: StoreDetail,
  editor: ValueEditor,
  versionRef: { current: number },
  lastSavedRef: { current: string },
  isBusy: () => boolean
) {
  const editorRef = useRef(editor)

  editorRef.current = editor

  useEffect(() => {
    if (store.version !== versionRef.current && !isBusy()) {
      versionRef.current = store.version
      lastSavedRef.current = JSON.stringify(store.value) ?? ""
      editorRef.current.reset(store.value, store.version > 0)
    }
  }, [store.version, store.value, versionRef, lastSavedRef, isBusy])
}

/** The surface under the toolbar: the schema-driven form, or the code the
 *  toggle swaps to. Every branch runs full-bleed against the page frame,
 *  the way the table grid does. Only a store the form cannot host — a
 *  schema the widgets cannot represent, or a value outside it — edits as
 *  raw text; everywhere else the code is the file editor's mirror. */
function ValueBody({
  editor,
  onEdit,
}: {
  editor: ValueEditor
  onEdit: () => void
}) {
  if (editor.state.view === "form" && editor.form !== undefined) {
    return (
      <div className={cn("relative min-h-0 flex-1 overflow-auto", scrollFade)}>
        <ValueFields
          errors={editor.state.fieldErrors}
          form={editor.form}
          onChange={(root, editedPath) => {
            editor.setRoot(root, editedPath)
            onEdit()
          }}
          root={editor.state.root}
        />
      </div>
    )
  }

  if (!editor.state.codeEditable) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<ConsoleListLoading />}>
          <Mirror
            mimeType="application/json"
            readOnly
            value={editor.state.codeText}
          />
        </Suspense>
      </div>
    )
  }

  return <CodeEditor editor={editor} onEdit={onEdit} />
}

/** Raw JSON for the stores the form cannot host. A textarea has no gutter
 *  to meet the page edge with, so it takes the page's own horizontal
 *  padding instead and its first column lines up under the toolbar's
 *  text. A slim strip below says why the last save was refused, and why
 *  this store edits as text at all. */
function CodeEditor({
  editor,
  onEdit,
}: {
  editor: ValueEditor
  onEdit: () => void
}) {
  const { codeError, codeNote } = editor.state

  return (
    <>
      <Textarea
        aria-label="Store value JSON"
        className="min-h-0 flex-1 resize-none rounded-none border-0 px-4 py-3 font-mono text-xs shadow-none ring-inset focus-visible:ring-2 focus-visible:ring-ring/50 md:px-6"
        onChange={(event) => {
          editor.setCodeText(event.target.value)
          onEdit()
        }}
        value={editor.state.codeText}
      />
      {codeError === undefined && codeNote === undefined ? null : (
        <div className="grid gap-1 border-t px-4 py-2 md:px-6">
          <FieldError>{codeError}</FieldError>
          {codeNote === undefined ? null : (
            <p className="text-muted-foreground text-xs">{codeNote}</p>
          )}
        </div>
      )}
    </>
  )
}
