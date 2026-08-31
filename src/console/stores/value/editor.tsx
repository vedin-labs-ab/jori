import { useMutation } from "convex/react"
import { type ReactNode, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "../../../../convex/_generated/api"
import { JsonBlock } from "../../shared/code"
import { ConsoleListContent } from "../../shared/list/frame"
import {
  conflictMessage,
  isVersionConflict,
} from "../../shared/materials/conflict"
import { parseJsonText } from "../json"
import { type StoreDetail } from "../types"
import { useValueAutosave, type ValueSaveOutcome } from "./autosave"
import { ValueFields } from "./fields"
import { useValueEditor, type ValueEditor, type ValueEditorView } from "./state"
import { StoreToolbar } from "./toolbar"

/** The store value editor is the page: a schema-driven form (with the
 *  JSON mirrored one toggle away) that saves itself — debounced,
 *  validated first, wholesale against the version it last saw. It renders
 *  the store toolbar too, so the view toggle sits in the header and the
 *  meta carries the save status; there is nothing to press. */
export function ValueEditorSection({
  organizationId,
  store,
  tools,
}: {
  organizationId: string
  store: StoreDetail
  /** Toolbar actions after the view toggle: schema, copy. */
  tools: ReactNode
}) {
  const write = useMutation(api.stores.console.writeValue)
  const editor = useValueEditor({
    hasValue: store.version > 0,
    schema: store.schema,
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
      <ConsoleListContent>
        {editor.state.view === "form" && editor.form !== undefined ? (
          <ValueFields
            errors={editor.state.fieldErrors}
            form={editor.form}
            onChange={(root, editedPath) => {
              editor.setRoot(root, editedPath)
              autosave.change()
            }}
            root={editor.state.root}
          />
        ) : (
          <ValueCodeView editor={editor} onEdit={autosave.change} />
        )}
      </ConsoleListContent>
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
 *  a schemaless store is code, not a choice. */
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

/** The code side of the toggle. While the form is the editing surface the
 *  JSON is a read-only, highlighted mirror; only a store the form cannot
 *  host — no schema, or a value outside it — edits as raw text. */
function ValueCodeView({
  editor,
  onEdit,
}: {
  editor: ValueEditor
  onEdit: () => void
}) {
  if (!editor.state.codeEditable) {
    const parsed = parseJsonText(editor.state.codeText)

    return (
      <JsonBlock
        className="max-h-none"
        value={parsed.ok ? parsed.value : editor.state.codeText}
      />
    )
  }

  return (
    <>
      <Textarea
        aria-label="Store value JSON"
        className="min-h-64 font-mono text-xs"
        onChange={(event) => {
          editor.setCodeText(event.target.value)
          onEdit()
        }}
        value={editor.state.codeText}
      />
      {editor.state.codeError === undefined ? null : (
        <p className="text-destructive text-xs" role="alert">
          {editor.state.codeError}
        </p>
      )}
      {editor.state.codeNote === undefined ? null : (
        <p className="text-muted-foreground text-xs">{editor.state.codeNote}</p>
      )}
    </>
  )
}
