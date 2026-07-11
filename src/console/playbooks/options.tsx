import {
  isPlaybookOptionEnabled,
  type PlaybookOptionField,
  type PlaybookOptionValues,
} from "@contracts/playbooks/options"
import { type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PlaybookSection } from "./meta"

/**
 * The catalog-declared setup knobs, one section per enabled field. `hints`
 * lets the dialog ground a field in live data (rendered under its control).
 */
export function PlaybookOptionsFields({
  disabled,
  fields,
  hints,
  onChange,
  values,
}: {
  disabled: boolean
  fields: readonly PlaybookOptionField[]
  hints?: Partial<Record<string, ReactNode>>
  onChange: (key: string, value: string | number) => void
  values: PlaybookOptionValues
}) {
  return (
    <>
      {fields
        .filter((field) => isPlaybookOptionEnabled(field, fields, values))
        .map((field) => (
          <PlaybookSection key={field.key} label={field.label}>
            <OptionControl
              disabled={disabled}
              field={field}
              onChange={(value) => onChange(field.key, value)}
              value={values[field.key]}
            />
            {hints?.[field.key]}
          </PlaybookSection>
        ))}
    </>
  )
}

function OptionControl({
  disabled,
  field,
  onChange,
  value,
}: {
  disabled: boolean
  field: PlaybookOptionField
  onChange: (value: string | number) => void
  value: string | number
}) {
  if (field.kind === "choice") {
    if (field.control === "select") {
      return (
        <OptionSelect
          disabled={disabled}
          items={field.choices}
          onChange={onChange}
          value={value}
        />
      )
    }

    return (
      <ToggleGroup
        className="justify-start"
        disabled={disabled}
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

  if (field.kind === "time") {
    return (
      <Input
        className="w-32"
        disabled={disabled}
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
      items={field.presets.map((preset) => ({
        value: String(preset),
        label: `${preset} minutes`,
      }))}
      onChange={(next) => onChange(Number(next))}
      value={value}
    />
  )
}

function OptionSelect({
  disabled,
  items,
  onChange,
  value,
}: {
  disabled: boolean
  items: ReadonlyArray<{ value: string; label: string }>
  onChange: (value: string) => void
  value: string | number
}) {
  return (
    <Select disabled={disabled} onValueChange={onChange} value={String(value)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
