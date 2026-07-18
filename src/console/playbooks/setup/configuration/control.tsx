import { type PlaybookOptionField } from "@contracts/playbooks/options"
import { type ReactNode } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export function OptionField({
  controlClassName,
  disabled,
  field,
  hint,
  label = true,
  muted = false,
  onChange,
  value,
}: {
  controlClassName?: string
  disabled: boolean
  field: PlaybookOptionField
  hint?: ReactNode
  label?: boolean
  muted?: boolean
  onChange: (value: boolean | number | string) => void
  value: boolean | number | string
}) {
  const id = `playbook-option-${field.key}`

  return (
    <div className="grid gap-2">
      {label ? (
        <Label
          className={cn(
            "text-muted-foreground transition-opacity duration-100",
            muted && "opacity-60"
          )}
          htmlFor={id}
        >
          {field.label}
        </Label>
      ) : null}
      <div
        className={cn(
          controlWidth(field),
          disabled && "cursor-not-allowed",
          controlClassName
        )}
      >
        <OptionControl
          disabled={disabled}
          field={field}
          id={id}
          onChange={onChange}
          value={value}
        />
      </div>
      {hint}
    </div>
  )
}

function OptionControl({
  disabled,
  field,
  id,
  onChange,
  value,
}: {
  disabled: boolean
  field: PlaybookOptionField
  id: string
  onChange: (value: boolean | number | string) => void
  value: boolean | number | string
}) {
  if (field.kind === "boolean") {
    return (
      <Checkbox
        aria-label={field.label}
        checked={value === true}
        disabled={disabled}
        id={id}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
    )
  }

  if (field.kind === "choice" && field.control !== "select") {
    return (
      <ChoiceToggle
        disabled={disabled}
        field={field}
        id={id}
        onChange={onChange}
        value={value}
      />
    )
  }

  if (field.kind === "time") {
    return (
      <Input
        className="w-full"
        disabled={disabled}
        id={id}
        onChange={(event) => {
          if (event.target.value !== "") {
            onChange(event.target.value)
          }
        }}
        type="time"
        value={String(value)}
      />
    )
  }

  return (
    <OptionSelect
      disabled={disabled}
      field={field}
      id={id}
      onChange={onChange}
      value={value}
    />
  )
}

/** Props shared by the two interchangeable choice renderers; OptionControl
 *  picks between them via the field's control preference. */
type ChoiceControlProps = {
  disabled: boolean
  field: Extract<PlaybookOptionField, { kind: "choice" }>
  id: string
  onChange: (value: string) => void
  value: boolean | number | string
}

function ChoiceToggle({
  disabled,
  field,
  id,
  onChange,
  value,
}: ChoiceControlProps) {
  return (
    <ToggleGroup
      aria-label={field.label}
      className="flex-wrap justify-start"
      disabled={disabled}
      id={id}
      onValueChange={(next) => {
        if (next !== "") {
          onChange(next)
        }
      }}
      type="single"
      value={String(value)}
      variant="outline"
    >
      {field.choices.map((choice) => (
        <ToggleGroupItem key={choice.value} value={choice.value}>
          {choice.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function OptionSelect({
  disabled,
  field,
  id,
  onChange,
  value,
}: ChoiceControlProps) {
  return (
    <Select disabled={disabled} onValueChange={onChange} value={String(value)}>
      <SelectTrigger className="w-full" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {field.choices.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function controlWidth(field: PlaybookOptionField) {
  if (field.kind === "time") {
    return "w-36"
  }

  if (field.kind === "choice" && field.control === "select") {
    return "w-full sm:w-48"
  }

  return "w-fit max-w-full"
}
