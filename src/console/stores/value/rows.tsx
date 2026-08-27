import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { type ChangeHandler, CheckInput } from "./inputs"
import { type ValueProperty } from "./model"

// Non-nesting property rows and shared row dressing for the value form;
// the recursive composition lives in fields.tsx.

export function PropertyLabel({
  htmlFor,
  property,
}: {
  htmlFor?: string
  property: ValueProperty
}) {
  return (
    <Label className="w-fit" htmlFor={htmlFor}>
      {property.name}
      {property.required ? null : (
        <span className="font-normal text-muted-foreground">(optional)</span>
      )}
    </Label>
  )
}

/** An optional field left unset: materializing it is an explicit choice,
 *  and clearing it back removes the key from the value again. */
export function UnsetRow({
  onAdd,
  property,
}: {
  onAdd: () => void
  property: ValueProperty
}) {
  return (
    <div className="flex items-center gap-2">
      <PropertyLabel property={property} />
      <Button
        aria-label={`Add ${property.name}`}
        onClick={onAdd}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus />
        Add
      </Button>
    </div>
  )
}

/** A required boolean property: a labeled checkbox, as in the tables
 *  console forms. Optional booleans render as a choice instead. */
export function CheckRow({
  checked,
  error,
  onChange,
  path,
  property,
}: {
  checked: boolean
  error: string | undefined
  onChange: ChangeHandler
  path: string
  property: ValueProperty
}) {
  return (
    <div className="grid gap-1.5">
      <label className="flex w-fit items-center gap-2 text-sm" htmlFor={path}>
        <CheckInput
          checked={checked}
          id={path}
          onCheckedChange={(next) =>
            onChange({ kind: "check", checked: next }, path)
          }
        />
        {property.name}
      </label>
      <FieldError message={error} />
    </div>
  )
}

export function FieldError({ message }: { message: string | undefined }) {
  if (message === undefined) {
    return null
  }

  return (
    <p className="text-destructive text-xs" role="alert">
      {message}
    </p>
  )
}
