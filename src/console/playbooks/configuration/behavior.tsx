import {
  isPlaybookBehaviorEnabled,
  isPlaybookOptionEnabled,
  type PlaybookBehavior,
  type PlaybookOptionField,
  type PlaybookOptionValues,
} from "@contracts/playbooks/options"
import { CalendarClock, Clock3, type LucideIcon, Sunrise } from "lucide-react"
import { type ReactNode } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { OptionField } from "./control"

const behaviorIcons: Record<string, LucideIcon> = {
  "before-meeting": CalendarClock,
  "morning-briefing": Sunrise,
}

export function BehaviorList({
  behaviors,
  disabled,
  fields,
  hints,
  onChange,
  values,
}: {
  behaviors: readonly PlaybookBehavior[]
  disabled: boolean
  fields: readonly PlaybookOptionField[]
  hints?: Partial<Record<string, ReactNode>>
  onChange: (key: string, value: boolean | number | string) => void
  values: PlaybookOptionValues
}) {
  return behaviors.map((behavior) => (
    <BehaviorRow
      behavior={behavior}
      disabled={disabled}
      fields={fields}
      hints={hints}
      key={behavior.key}
      onChange={onChange}
      values={values}
    />
  ))
}

function BehaviorRow({
  behavior,
  disabled,
  fields,
  hints,
  onChange,
  values,
}: {
  behavior: PlaybookBehavior
  disabled: boolean
  fields: readonly PlaybookOptionField[]
  hints?: Partial<Record<string, ReactNode>>
  onChange: (key: string, value: boolean | number | string) => void
  values: PlaybookOptionValues
}) {
  const Icon = behaviorIcons[behavior.key] ?? Clock3
  const enabled = isPlaybookBehaviorEnabled(behavior, values)
  const enabledBy = behavior.enabledBy
  const checkboxId = `playbook-behavior-${behavior.key}`
  const visibleFields = behavior.fields.filter((field) =>
    isPlaybookOptionEnabled(field, fields, values)
  )

  return (
    <div className="grid gap-3 p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <Label className="grid min-w-0 flex-1 gap-0.5" htmlFor={checkboxId}>
          <span className="font-medium text-foreground">{behavior.label}</span>
          {behavior.description === undefined ? null : (
            <span className="font-normal text-muted-foreground">
              {behavior.description}
            </span>
          )}
        </Label>
        {enabledBy === undefined ? null : (
          <Checkbox
            aria-label={`Include ${behavior.label.toLowerCase()}`}
            checked={enabled}
            disabled={disabled}
            id={checkboxId}
            onCheckedChange={(checked) =>
              onChange(enabledBy.key, checked === true)
            }
          />
        )}
      </div>
      {visibleFields.length === 0 ? null : (
        <div className="grid gap-3 pl-11 sm:grid-cols-2">
          {visibleFields.map((field) => (
            <OptionField
              disabled={disabled}
              field={field}
              hint={hints?.[field.key]}
              key={field.key}
              onChange={(value) => onChange(field.key, value)}
              value={values[field.key]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
