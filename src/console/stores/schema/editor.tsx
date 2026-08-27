import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { SchemaFieldList } from "./fields"
import { type SchemaEditor, type SchemaEditorView } from "./state"

/** The store schema editor: a field-list form by default, with a code view
 *  over the raw JSON Schema for anything the form cannot express. */
export function SchemaEditorSection({
  editor,
  idPrefix,
}: {
  editor: SchemaEditor
  idPrefix: string
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`${idPrefix}-schema`}>Schema</Label>
        <Tabs
          onValueChange={(view) => editor.switchView(view as SchemaEditorView)}
          value={editor.state.view}
        >
          <TabsList className="!h-7">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {editor.state.view === "form" ? (
        <SchemaFieldList
          errors={editor.state.fieldErrors}
          fields={editor.state.fields}
          onChange={editor.setFields}
          onErrorClear={editor.clearFieldError}
        />
      ) : (
        <SchemaCodeView editor={editor} idPrefix={idPrefix} />
      )}
      {editor.state.submitError === undefined ? null : (
        <p className="text-destructive text-xs" role="alert">
          {editor.state.submitError}
        </p>
      )}
    </div>
  )
}

function SchemaCodeView({
  editor,
  idPrefix,
}: {
  editor: SchemaEditor
  idPrefix: string
}) {
  return (
    <>
      <Textarea
        className="min-h-40 font-mono text-xs"
        id={`${idPrefix}-schema`}
        onChange={(event) => editor.setCodeText(event.target.value)}
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
