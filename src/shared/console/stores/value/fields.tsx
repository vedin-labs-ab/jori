import { FieldError } from "@/components/ui/field"
import { ArrayFields } from "./arrays"
import { emptyState, hasUnsetAffordance, type ValueState } from "./convert"
import { type ChangeHandler, LeafControl } from "./inputs"
import { type ValueField, type ValueProperty } from "./model"
import {
  ErrorRow,
  GroupRow,
  KeyCell,
  RemoveButton,
  UnsetRow,
  valueRowClassName,
} from "./rows"
import { valueRootPath } from "./state"

// The schema-driven value form as one hairline key/value grid, in the
// table editor's idiom: rows run edge to edge against the page frame,
// keys align in a fixed left column with nesting indented inside it,
// values edit in borderless cell-native widgets, and object and array
// structure reads from quiet group rows. Every widget writes back into
// one form-state tree; errors are keyed by value path and appear only
// after a submit attempt.

type ObjectField = Extract<ValueField, { kind: "object" }>
type ObjectState = Extract<ValueState, { kind: "object" }>

export function ValueFields({
  errors,
  form,
  onChange,
  root,
}: {
  errors: Record<string, string>
  form: ValueField
  onChange: ChangeHandler
  root: ValueState
}) {
  if (form.kind !== "object" || root.kind !== "object") {
    return null
  }

  return (
    <ObjectRows
      depth={0}
      errors={errors}
      field={form}
      onChange={onChange}
      path={valueRootPath}
      state={root}
    />
  )
}

function ObjectRows({
  depth,
  errors,
  field,
  onChange,
  path,
  state,
}: {
  depth: number
  errors: Record<string, string>
  field: ObjectField
  onChange: ChangeHandler
  path: string
  state: ObjectState
}) {
  return (
    <>
      {field.properties.length === 0 ? (
        <p className="border-b px-3 py-2 text-muted-foreground text-xs">
          The schema declares no fields, so the value is an empty object.
        </p>
      ) : null}
      {field.properties.map((property) => (
        <PropertyRows
          depth={depth}
          errors={errors}
          key={property.name}
          onChildChange={(child, editedPath) =>
            onChange(withChild(state, property.name, child), editedPath)
          }
          path={`${path}.${property.name}`}
          property={property}
          state={state.children[property.name]}
        />
      ))}
      <ErrorRow message={errors[path]} />
    </>
  )
}

function withChild(
  state: ObjectState,
  name: string,
  child: ValueState | undefined
): ObjectState {
  const children = { ...state.children }

  if (child === undefined) {
    delete children[name]
  } else {
    children[name] = child
  }

  return { kind: "object", children }
}

function PropertyRows({
  depth,
  errors,
  onChildChange,
  path,
  property,
  state,
}: {
  depth: number
  errors: Record<string, string>
  onChildChange: (state: ValueState | undefined, editedPath: string) => void
  path: string
  property: ValueProperty
  state: ValueState | undefined
}) {
  if (state === undefined) {
    return (
      <UnsetRow
        depth={depth}
        onAdd={() => onChildChange(emptyState(property.field), path)}
        property={property}
      />
    )
  }

  if (isComposite(property.field)) {
    return (
      <>
        <GroupRow
          depth={depth}
          onUnset={
            !property.required && hasUnsetAffordance(property.field)
              ? () => onChildChange(undefined, path)
              : undefined
          }
          property={property}
        />
        <NestedRows
          depth={depth + 1}
          errors={errors}
          field={property.field}
          label={property.name}
          onChange={onChildChange}
          path={path}
          state={state}
        />
      </>
    )
  }

  return (
    <div className={valueRowClassName}>
      <KeyCell depth={depth} htmlFor={path} property={property} />
      <div className="min-w-0 flex-1">
        <LeafControl
          field={property.field}
          id={path}
          invalid={errors[path] !== undefined}
          onChange={onChildChange}
          path={path}
          required={property.required}
          state={state}
        />
        <FieldError className="px-3 pb-2">{errors[path]}</FieldError>
      </div>
      {!property.required && hasUnsetAffordance(property.field) ? (
        <RemoveButton
          label={`Unset ${property.name}`}
          onClick={() => onChildChange(undefined, path)}
        />
      ) : null}
    </div>
  )
}

function isComposite(field: ValueField) {
  return field.kind === "array" || field.kind === "object"
}

/** The rows for one nested object or array node, in either a property or
 *  an array item. */
function NestedRows({
  depth,
  errors,
  field,
  label,
  onChange,
  path,
  state,
}: {
  depth: number
  errors: Record<string, string>
  field: ValueField
  label: string
  onChange: ChangeHandler
  path: string
  state: ValueState
}) {
  if (field.kind === "object" && state.kind === "object") {
    return (
      <ObjectRows
        depth={depth}
        errors={errors}
        field={field}
        onChange={onChange}
        path={path}
        state={state}
      />
    )
  }

  if (field.kind === "array" && state.kind === "array") {
    return (
      <ArrayFields
        composite={isComposite(field.items)}
        depth={depth}
        error={errors[path]}
        label={label}
        makeItem={() => emptyState(field.items)}
        onChange={onChange}
        path={path}
        renderItem={(item, itemPath, itemLabel, onItemChange) =>
          isComposite(field.items) ? (
            <NestedRows
              depth={depth + 1}
              errors={errors}
              field={field.items}
              label={itemLabel}
              onChange={onItemChange}
              path={itemPath}
              state={item}
            />
          ) : (
            <>
              <LeafControl
                ariaLabel={itemLabel}
                field={field.items}
                invalid={errors[itemPath] !== undefined}
                onChange={onItemChange}
                path={itemPath}
                required
                state={item}
              />
              <FieldError className="px-3 pb-2">{errors[itemPath]}</FieldError>
            </>
          )
        }
        state={state}
      />
    )
  }

  return null
}
