import { type JsonSchemaObject } from "@contracts/schema/validate"
import { useMutation } from "convex/react"
import { lazy, type ReactNode, Suspense, useEffect, useRef } from "react"
import { toast } from "sonner"
import { FieldError } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import {
  conflictMessage,
  isVersionConflict,
} from "@/shared/console/materials/conflict"
import { type StoreDetail } from "@/shared/console/stores/types"
import { scrollFade } from "@/shared/fade"
import { api } from "../../../../convex/_generated/api"
import { useValueAutosave, type ValueSaveOutcome } from "./autosave"
import { ValueFields } from "./fields"
import { useValueEditor, type ValueEditor, type ValueEditorView } from "./state"
import { StoreToolbar } from "./toolbar"

/** CodeMirror loads only once the code view is on screen, keeping it out
 *  of the console bundle and the server build. */
const Mirror = lazy(() =>
  import("@/shared/console/mirror/view").then((module) => ({
    default: module.Mirror,
  }))
)

/** The store value editor is the page: a schema-driven form (with the
 *  JSON mirrored one toggle away) that saves itself — debounced,
 *  validated first, wholesale against the version it last saw. It renders
 *  the store toolbar too, so the view toggle sits in the header and the
 *  meta carries the save status; there is nothing to press. */
export function ValueEditorSection({
  organizationId,
  schema,
  store,
  tools,
}: {
  organizationId: string
  /** The store's schema, which the form is built from — the editor only
   *  renders for a store that has one. */
  schema: JsonSchemaObject
  store: StoreDetail
  /** Toolbar actions after the view toggle: schema, copy. */
  tools: ReactNode
}) {
  const write = useMutation(api.stores.console.writeValue)
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
    saveValue({
      editor,
      lastSavedRef,
      organizationId,
      store,
      versionRef,
      write,
    })

  const autosave = useValueAutosave(() => performRef.current())

  useExternalReseed(store, editor, versionRef, lastSavedRef, autosave.isBusy)

  return (
    <>
      <StoreToolbar
        saveStatus={autosave.status}
        store={store}
        tools={
          <>
            <ViewToggle editor={editor} />
            {tools}
          </>
        }
      />
      <ValueBody editor={editor} onEdit={autosave.change} />
    </>
  )
}

/** One save attempt: validate, skip a buffer already at the saved value —
 *  an edit typed and reverted must not burn a version — then write
 *  wholesale against the version last seen. Writes bump the version by
 *  one; tracking it locally keeps rapid follow-up saves ahead of the
 *  subscription's round-trip. */
async function saveValue({
  editor,
  lastSavedRef,
  organizationId,
  store,
  versionRef,
  write,
}: {
  editor: ValueEditor
  lastSavedRef: { current: string }
  organizationId: string
  store: StoreDetail
  versionRef: { current: number }
  write: (args: {
    organizationId: string
    storeId: StoreDetail["storeId"]
    value: unknown
    expectedVersion: number
  }) => Promise<unknown>
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
    await write({
      organizationId,
      storeId: store.storeId,
      value: result.value,
      expectedVersion: versionRef.current,
    })
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

/** Form/Code in the toolbar, hidden while there is no form to toggle to:
 *  a schema the widgets cannot represent is code, not a choice. */
function ViewToggle({ editor }: { editor: ValueEditor }) {
  if (editor.form === undefined) {
    return null
  }

  return (
    <Tabs
      onValueChange={(view) => editor.switchView(view as ValueEditorView)}
      value={editor.state.view}
    >
      <TabsList className="!h-7">
        <TabsTrigger value="form">Form</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
      </TabsList>
    </Tabs>
  )
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
