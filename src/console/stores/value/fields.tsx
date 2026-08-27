import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ArrayFields } from "./arrays"
import { emptyState, hasUnsetAffordance, type ValueState } from "./convert"
import { type ChangeHandler, LeafControl } from "./inputs"
import { type ValueField, type ValueProperty } from "./model"
import { CheckRow, FieldError, PropertyLabel, UnsetRow } from "./rows"
import { valueRootPath } from "./state"

// The schema-driven value form: object properties render as labeled rows
// in schema order, nested objects and arrays indent the way the schema
// builder does, and every widget writes back into one form-state tree.
// Errors are keyed by value path and appear only after a submit attempt.

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
    <ObjectFields
      errors={errors}
      field={form}
      onChange={onChange}
      path={valueRootPath}
      state={root}
    />
  )
}

function ObjectFields({
  errors,
  field,
  onChange,
  path,
  state,
}: {
  errors: Record<string, string>
  field: ObjectField
  onChange: ChangeHandler
  path: string
  state: ObjectState
}) {
  return (
    <div className="grid gap-3">
      {field.properties.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          The schema declares no fields, so the value is an empty object.
        </p>
      ) : null}
      {field.properties.map((property) => (
        <PropertyRow
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
      <FieldError message={errors[path]} />
    </div>
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

function PropertyRow({
  errors,
  onChildChange,
  path,
  property,
  state,
}: {
  errors: Record<string, string>
  onChildChange: (state: ValueState | undefined, editedPath: string) => void
  path: string
  property: ValueProperty
  state: ValueState | undefined
}) {
  if (state === undefined) {
    return (
      <UnsetRow
        onAdd={() => onChildChange(emptyState(property.field), path)}
        property={property}
      />
    )
  }

  if (state.kind === "check") {
    return (
      <CheckRow
        checked={state.checked}
        error={errors[path]}
        onChange={onChildChange}
        path={path}
        property={property}
      />
    )
  }

  const hasInput = state.kind === "text" || state.kind === "choice"

  return (
    <div className="grid gap-1.5">
      <span className="flex items-center gap-1">
        <PropertyLabel
          htmlFor={hasInput ? path : undefined}
          property={property}
        />
        {!property.required && hasUnsetAffordance(property.field) ? (
          <Button
            aria-label={`Unset ${property.name}`}
            onClick={() => onChildChange(undefined, path)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        ) : null}
      </span>
      <FieldBody
        errors={errors}
        field={property.field}
        id={path}
        label={property.name}
        onChange={onChildChange}
        path={path}
        required={property.required}
        state={state}
      />
    </div>
  )
}

/** The widget or nested group for one field, in either a property row or
 *  an array row. */
function FieldBody({
  ariaLabel,
  errors,
  field,
  id,
  label,
  onChange,
  path,
  required,
  state,
}: {
  ariaLabel?: string
  errors: Record<string, string>
  field: ValueField
  id?: string
  label: string
  onChange: ChangeHandler
  path: string
  required: boolean
  state: ValueState
}) {
  if (field.kind === "object" && state.kind === "object") {
    return (
      <div className="ml-1.5 border-l pl-3">
        <ObjectFields
          errors={errors}
          field={field}
          onChange={onChange}
          path={path}
          state={state}
        />
      </div>
    )
  }

  if (field.kind === "array" && state.kind === "array") {
    return (
      <div className="ml-1.5 border-l pl-3">
        <ArrayFields
          error={errors[path]}
          label={label}
          makeItem={() => emptyState(field.items)}
          onChange={onChange}
          path={path}
          renderItem={(item, itemPath, itemLabel, onItemChange) => (
            <FieldBody
              ariaLabel={itemLabel}
              errors={errors}
              field={field.items}
              label={itemLabel}
              onChange={onItemChange}
              path={itemPath}
              required
              state={item}
            />
          )}
          state={state}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-1.5">
      <LeafControl
        ariaLabel={ariaLabel}
        field={field}
        id={id}
        invalid={errors[path] !== undefined}
        onChange={onChange}
        path={path}
        required={required}
        state={state}
      />
      <FieldError message={errors[path]} />
    </div>
  )
}
