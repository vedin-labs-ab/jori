import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type ValueState } from "./convert"
import { type ValueField, type ValueOption } from "./model"

// Leaf widgets for the value form. Each one maps a single form-state leaf
// onto a shadcn primitive; composition and nesting live in fields.tsx.

/** How every widget reports edits: the replacement state for its node and
 *  the value path that changed, so the editor can clear that path's error. */
export type ChangeHandler = (next: ValueState, editedPath: string) => void

/** The widget for one non-nesting field: scalar, enum, or constant. */
export function LeafControl({
  ariaLabel,
  field,
  id,
  invalid,
  onChange,
  path,
  required,
  state,
}: {
  ariaLabel?: string
  field: ValueField
  id?: string
  invalid: boolean
  onChange: ChangeHandler
  path: string
  required: boolean
  state: ValueState
}) {
  if (field.kind === "constant") {
    return <ConstantValue value={field.value} />
  }

  if (field.kind === "enum" && state.kind === "choice") {
    return (
      <ChoiceSelect
        allowUnset={!required}
        ariaLabel={ariaLabel}
        id={id}
        index={state.index}
        invalid={invalid}
        onIndexChange={(index) => onChange({ kind: "choice", index }, path)}
        options={field.options}
      />
    )
  }

  if (state.kind === "check") {
    return (
      <CheckInput
        ariaLabel={ariaLabel}
        checked={state.checked}
        id={id}
        onCheckedChange={(checked) =>
          onChange({ kind: "check", checked }, path)
        }
      />
    )
  }

  if (state.kind === "text") {
    return (
      <ScalarInput
        ariaLabel={ariaLabel}
        id={id}
        integer={field.kind === "number" && field.integer}
        invalid={invalid}
        numeric={field.kind === "number"}
        onTextChange={(text) => onChange({ kind: "text", text }, path)}
        text={state.text}
      />
    )
  }

  return null
}

export function ScalarInput({
  ariaLabel,
  id,
  integer,
  invalid,
  numeric,
  onTextChange,
  text,
}: {
  ariaLabel?: string
  id?: string
  integer?: boolean
  invalid: boolean
  numeric: boolean
  onTextChange: (text: string) => void
  text: string
}) {
  return (
    <Input
      aria-invalid={invalid ? true : undefined}
      aria-label={ariaLabel}
      id={id}
      inputMode={numeric ? "decimal" : undefined}
      onChange={(event) => onTextChange(event.target.value)}
      step={numeric ? (integer === true ? 1 : "any") : undefined}
      type={numeric ? "number" : "text"}
      value={text}
    />
  )
}

export function CheckInput({
  ariaLabel,
  checked,
  id,
  onCheckedChange,
}: {
  ariaLabel?: string
  checked: boolean
  id?: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Checkbox
      aria-label={ariaLabel}
      checked={checked}
      id={id}
      onCheckedChange={(next) => onCheckedChange(next === true)}
    />
  )
}

const unsetChoice = "unset"

/** One allowed value from an enum; optional fields get an explicit way
 *  back to unset, which omits the field from the value. */
export function ChoiceSelect({
  allowUnset,
  ariaLabel,
  id,
  index,
  invalid,
  onIndexChange,
  options,
}: {
  allowUnset: boolean
  ariaLabel?: string
  id?: string
  index: number | undefined
  invalid: boolean
  onIndexChange: (index: number | undefined) => void
  options: ValueOption[]
}) {
  return (
    <Select
      onValueChange={(next) =>
        onIndexChange(next === unsetChoice ? undefined : Number(next))
      }
      value={index === undefined ? "" : String(index)}
    >
      <SelectTrigger
        aria-invalid={invalid ? true : undefined}
        aria-label={ariaLabel}
        className="w-full"
        id={id}
      >
        <SelectValue placeholder={allowUnset ? "Not set" : "Select a value"} />
      </SelectTrigger>
      <SelectContent>
        {allowUnset ? (
          <SelectItem value={unsetChoice}>
            <span className="text-muted-foreground">Not set</span>
          </SelectItem>
        ) : null}
        {options.map((option, position) => (
          <SelectItem key={JSON.stringify(option)} value={String(position)}>
            {optionLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function optionLabel(option: ValueOption) {
  return typeof option === "string" ? option : JSON.stringify(option)
}

/** A const (or null-typed) field: the schema fixes the value, so it only
 *  reads back. */
export function ConstantValue({ value }: { value: unknown }) {
  return (
    <p className="py-1 font-mono text-muted-foreground text-xs">
      {JSON.stringify(value)}
    </p>
  )
}
