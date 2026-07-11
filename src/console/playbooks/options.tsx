import {
  isPlaybookOptionEnabled,
  type PlaybookOptionField,
  type PlaybookOptionValues,
} from "@contracts/playbooks/options"
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

/** The catalog-declared setup knobs, one section per enabled field. */
export function PlaybookOptionsFields({
  disabled,
  fields,
  onChange,
  values,
}: {
  disabled: boolean
  fields: readonly PlaybookOptionField[]
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
    <Select
      disabled={disabled}
      onValueChange={(next) => onChange(Number(next))}
      value={String(value)}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {field.presets.map((preset) => (
          <SelectItem key={preset} value={String(preset)}>
            {preset} minutes
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
