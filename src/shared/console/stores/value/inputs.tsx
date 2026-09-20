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

// Leaf widgets for the value form, in the table grid's cell-native idiom:
// no chrome of their own, filling their cell to its edges with the focus
// ring drawn inset along them. Composition and nesting live in fields.tsx.

/** The cell recipe from the table grid's inline editor. */
const cellInputClassName =
  // Square throughout: the grid is full-bleed and has no curved frame, so
  // a rounded ring would draw corners nothing else follows.
  "h-9 rounded-none border-0 bg-transparent px-3 text-xs shadow-none ring-inset focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-ring aria-invalid:focus-visible:ring-destructive/20 dark:bg-transparent"

/** The same recipe over the select trigger, which also sheds its tactile
 *  depth so it sits flush like every other cell. */
const cellSelectClassName =
  "h-9 w-full rounded-none border-0 bg-transparent px-3 shadow-none ring-inset transition-colors not-aria-disabled:active:translate-y-0 not-aria-disabled:active:shadow-none data-[size=default]:h-9 data-[state=open]:translate-y-0 data-[state=open]:shadow-none hover:bg-muted/50 focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-ring aria-invalid:focus-visible:ring-destructive/20 dark:bg-transparent dark:hover:bg-muted/50"

/** How every widget reports edits: the replacement state for its node and
 *  the value path that changed, so the editor can clear that path's error. */
export type ChangeHandler = (next: ValueState, editedPath: string) => void

/** The widget for one non-nesting field: scalar, enum, or constant. */
export function LeafControl({
  ariaLabel,
  describedBy,
  field,
  id,
  invalid,
  onChange,
  path,
  required,
  state,
}: {
  ariaLabel?: string
  describedBy?: string
  field: ValueField
  id?: string
  invalid: boolean
  onChange: ChangeHandler
  path: string
  required: boolean
  state: ValueState
}) {
  if (field.kind === "constant") {
    return <ConstantValue describedBy={describedBy} value={field.value} />
  }

  if (field.kind === "enum" && state.kind === "choice") {
    return (
      <ChoiceSelect
        allowUnset={!required}
        ariaLabel={ariaLabel}
        describedBy={describedBy}
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
      <span className="flex h-9 items-center px-3">
        <CheckInput
          ariaLabel={ariaLabel}
          checked={state.checked}
          describedBy={describedBy}
          id={id}
          invalid={invalid}
          onCheckedChange={(checked) =>
            onChange({ kind: "check", checked }, path)
          }
        />
      </span>
    )
  }

  if (state.kind === "text") {
    return (
      <ScalarInput
        ariaLabel={ariaLabel}
        describedBy={describedBy}
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

function ScalarInput({
  ariaLabel,
  describedBy,
  id,
  integer,
  invalid,
  numeric,
  onTextChange,
  text,
}: {
  ariaLabel?: string
  describedBy?: string
  id?: string
  integer?: boolean
  invalid: boolean
  numeric: boolean
  onTextChange: (text: string) => void
  text: string
}) {
  return (
    <Input
      aria-describedby={describedBy}
      aria-invalid={invalid ? true : undefined}
      aria-label={ariaLabel}
      className={cellInputClassName}
      id={id}
      inputMode={numeric ? "decimal" : undefined}
      onChange={(event) => onTextChange(event.target.value)}
      step={numeric ? (integer === true ? 1 : "any") : undefined}
      type={numeric ? "number" : "text"}
      value={text}
    />
  )
}

function CheckInput({
  ariaLabel,
  checked,
  describedBy,
  id,
  invalid,
  onCheckedChange,
}: {
  ariaLabel?: string
  checked: boolean
  describedBy?: string
  id?: string
  invalid: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Checkbox
      aria-describedby={describedBy}
      aria-invalid={invalid ? true : undefined}
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
function ChoiceSelect({
  allowUnset,
  ariaLabel,
  describedBy,
  id,
  index,
  invalid,
  onIndexChange,
  options,
}: {
  allowUnset: boolean
  ariaLabel?: string
  describedBy?: string
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
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        aria-label={ariaLabel}
        className={cellSelectClassName}
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
function ConstantValue({
  describedBy,
  value,
}: {
  describedBy?: string
  value: unknown
}) {
  return (
    <p
      aria-describedby={describedBy}
      aria-invalid={describedBy === undefined ? undefined : true}
      className="flex h-9 items-center px-3 font-mono text-muted-foreground text-xs outline-none aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:ring-inset"
      tabIndex={describedBy === undefined ? undefined : 0}
    >
      {JSON.stringify(value)}
    </p>
  )
}
