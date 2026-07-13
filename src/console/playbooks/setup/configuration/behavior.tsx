import {
  describePlaybookBehavior,
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
import { cn } from "@/lib/utils"
import { PlaybookIcon } from "../../meta"
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
  const description = describePlaybookBehavior(behavior, values)

  return (
    <div className="relative grid gap-3 p-3">
      {enabledBy === undefined ? null : (
        <Label
          className={cn(
            "absolute inset-0 z-0 transition-colors duration-100",
            disabled ? "pointer-events-none" : "hover:bg-muted/40"
          )}
          htmlFor={checkboxId}
        >
          <span className="sr-only">Toggle {behavior.label.toLowerCase()}</span>
        </Label>
      )}
      <div className="pointer-events-none relative z-10 flex items-center gap-3">
        <PlaybookIcon icon={Icon} />
        <div className="grid min-w-0 flex-1 gap-1">
          <span className="font-medium text-foreground">{behavior.label}</span>
          {description === undefined ? null : (
            <span className="font-normal text-muted-foreground">
              {description}
            </span>
          )}
        </div>
        {enabledBy === undefined ? null : (
          <Checkbox
            aria-label={`Include ${behavior.label.toLowerCase()}`}
            checked={enabled}
            className="pointer-events-auto"
            disabled={disabled}
            id={checkboxId}
            onCheckedChange={(checked) =>
              onChange(enabledBy.key, checked === true)
            }
          />
        )}
      </div>
      {behavior.fields.length === 0 ? null : (
        <div className="pointer-events-none relative z-10 grid gap-3 pl-11 sm:grid-cols-2">
          {behavior.fields.map((field) => {
            const fieldEnabled = isPlaybookOptionEnabled(field, fields, values)

            return (
              <OptionField
                controlClassName="pointer-events-auto"
                disabled={disabled || !fieldEnabled}
                field={field}
                hint={hints?.[field.key]}
                key={field.key}
                muted={!fieldEnabled}
                onChange={(value) => onChange(field.key, value)}
                value={values[field.key]}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
