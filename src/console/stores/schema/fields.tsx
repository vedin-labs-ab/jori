import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  createField,
  type FieldItemType,
  hasChildFields,
  type SchemaField,
} from "./model"

/** One list of sibling fields; object fields and arrays of objects nest
 *  another list underneath their row. */
export function SchemaFieldList({
  errors,
  fields,
  onChange,
  onErrorClear,
}: {
  errors: Record<string, string>
  fields: SchemaField[]
  onChange: (fields: SchemaField[]) => void
  onErrorClear: (fieldId: string) => void
}) {
  return (
    <div className="grid gap-2">
      {fields.map((field) => (
        <SchemaFieldRow
          errors={errors}
          field={field}
          key={field.id}
          onChange={(next) =>
            onChange(fields.map((entry) => (entry === field ? next : entry)))
          }
          onErrorClear={onErrorClear}
          onRemove={() => onChange(fields.filter((entry) => entry !== field))}
        />
      ))}
      <Button
        className="w-fit"
        onClick={() => onChange([...fields, createField()])}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus />
        Add field
      </Button>
    </div>
  )
}

type RowProps = {
  errors: Record<string, string>
  field: SchemaField
  onChange: (field: SchemaField) => void
  onErrorClear: (fieldId: string) => void
  onRemove: () => void
}

function SchemaFieldRow(props: RowProps) {
  const { errors, field, onChange, onErrorClear } = props
  const error = errors[field.id]

  return (
    <div className="grid gap-2">
      <FieldRowControls {...props} error={error} />
      {error === undefined ? null : (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
      {hasChildFields(field) ? (
        <div className="ml-1.5 border-l pl-3">
          <SchemaFieldList
            errors={errors}
            fields={field.fields}
            onChange={(fields) => onChange({ ...field, fields })}
            onErrorClear={onErrorClear}
          />
        </div>
      ) : null}
    </div>
  )
}

function FieldRowControls({
  error,
  field,
  onChange,
  onErrorClear,
  onRemove,
}: RowProps & { error: string | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        aria-invalid={error === undefined ? undefined : true}
        aria-label="Field name"
        className="min-w-0 flex-1"
        onChange={(event) => {
          onChange({ ...field, name: event.target.value })
          onErrorClear(field.id)
        }}
        placeholder="field_name"
        value={field.name}
      />
      <FieldTypeSelect field={field} onChange={onChange} />
      <span className="flex shrink-0 items-center gap-1.5">
        <Switch
          checked={field.required}
          id={`${field.id}-required`}
          onCheckedChange={(required) => onChange({ ...field, required })}
        />
        <Label
          className="font-normal text-muted-foreground text-xs"
          htmlFor={`${field.id}-required`}
        >
          Required
        </Label>
      </span>
      <Button
        aria-label={`Remove field ${field.name === "" ? "draft" : field.name}`}
        onClick={onRemove}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X />
      </Button>
    </div>
  )
}

// The type picker folds an array's item type into one choice, so a row is
// the same width whatever the type.
const typeChoices = [
  { label: "String", value: "string" },
  { label: "Number", value: "number" },
  { label: "Integer", value: "integer" },
  { label: "Boolean", value: "boolean" },
  { label: "Object", value: "object" },
  { label: "Array of strings", value: "array:string" },
  { label: "Array of numbers", value: "array:number" },
  { label: "Array of integers", value: "array:integer" },
  { label: "Array of booleans", value: "array:boolean" },
  { label: "Array of objects", value: "array:object" },
] as const

type TypeChoice = (typeof typeChoices)[number]["value"]

function FieldTypeSelect({
  field,
  onChange,
}: {
  field: SchemaField
  onChange: (field: SchemaField) => void
}) {
  const choice: TypeChoice =
    field.type === "array" ? `array:${field.itemType}` : field.type

  return (
    <Select
      onValueChange={(next) => onChange(applyTypeChoice(field, next))}
      value={choice}
    >
      <SelectTrigger aria-label="Field type" className="w-36 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {typeChoices.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function applyTypeChoice(field: SchemaField, choice: string): SchemaField {
  if (choice.startsWith("array:")) {
    const itemType = choice.slice("array:".length) as FieldItemType

    return { ...field, type: "array", itemType }
  }

  return { ...field, type: choice as SchemaField["type"] }
}
