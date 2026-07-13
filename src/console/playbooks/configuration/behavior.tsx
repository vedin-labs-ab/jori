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
import { cn } from "@/lib/utils"
import { PlaybookIcon } from "../meta"
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

  return (
    <div
      className={cn(
        "group/behavior grid gap-3 p-3 transition-colors duration-100",
        enabledBy !== undefined && !disabled && "hover:bg-muted/40"
      )}
    >
      <div className="flex items-center gap-3">
        <BehaviorLabel
          behavior={behavior}
          checkboxId={checkboxId}
          disabled={disabled}
          icon={Icon}
          toggleable={enabledBy !== undefined}
        />
        {enabledBy === undefined ? null : (
          <Checkbox
            aria-label={`Include ${behavior.label.toLowerCase()}`}
            checked={enabled}
            className={cn(
              "transition-transform duration-100",
              !disabled && "group-hover/behavior:scale-105"
            )}
            disabled={disabled}
            id={checkboxId}
            onCheckedChange={(checked) =>
              onChange(enabledBy.key, checked === true)
            }
          />
        )}
      </div>
      {behavior.fields.length === 0 ? null : (
        <div className="grid gap-3 pl-11 sm:grid-cols-2">
          {behavior.fields.map((field) => {
            const fieldEnabled = isPlaybookOptionEnabled(field, fields, values)

            return (
              <OptionField
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

function BehaviorLabel({
  behavior,
  checkboxId,
  disabled,
  icon,
  toggleable,
}: {
  behavior: PlaybookBehavior
  checkboxId: string
  disabled: boolean
  icon: LucideIcon
  toggleable: boolean
}) {
  const content = (
    <>
      <PlaybookIcon icon={icon} />
      <span className="grid min-w-0 gap-1">
        <span className="font-medium text-foreground">{behavior.label}</span>
        {behavior.description === undefined ? null : (
          <span className="font-normal text-muted-foreground">
            {behavior.description}
          </span>
        )}
      </span>
    </>
  )

  return toggleable ? (
    <Label
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3",
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      )}
      htmlFor={checkboxId}
    >
      {content}
    </Label>
  ) : (
    <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
  )
}
