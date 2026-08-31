import { type JsonSchemaObject } from "@contracts/schema/validate"
import { JsonBlock } from "../../shared/code"
import { SchemaFieldList } from "./fields"
import { type SchemaEditor } from "./state"

/** The store schema editor: the field builder and nothing else, so every
 *  schema the console authors is one the console can read back. A schema
 *  written through the API may use features the rows cannot represent;
 *  that one reads as the document it is, and removing it is the way back
 *  to the builder. */
export function SchemaEditorSection({
  editor,
  schema,
}: {
  editor: SchemaEditor
  /** The stored schema, shown when the builder cannot represent it. */
  schema: JsonSchemaObject | undefined
}) {
  const { fieldErrors, fields, submitError } = editor.state

  return (
    <div className="grid gap-1.5">
      {fields === undefined ? (
        <UneditableSchema schema={schema} />
      ) : (
        <SchemaFieldList
          errors={fieldErrors}
          fields={fields}
          onChange={editor.setFields}
          onErrorClear={editor.clearFieldError}
        />
      )}
      {submitError === undefined ? null : (
        <p className="text-destructive text-xs" role="alert">
          {submitError}
        </p>
      )}
    </div>
  )
}

/** A schema outside the builder's vocabulary — enums, anyOf, a map of
 *  values — reads rather than edits. Removing it is the only change the
 *  dialog can still offer. */
function UneditableSchema({
  schema,
}: {
  schema: JsonSchemaObject | undefined
}) {
  return (
    <>
      <JsonBlock className="rounded-md border" value={schema} />
      <p className="text-muted-foreground text-xs">
        This schema uses JSON Schema features the builder cannot edit. Remove it
        to define one here.
      </p>
    </>
  )
}
