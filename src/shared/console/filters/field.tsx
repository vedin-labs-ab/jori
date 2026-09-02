import { type ReactNode } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

/** Pairs a control with a muted label: above it in the filter panel, or
 *  inline beside it where a form borrows the pairing. */
export function ConsoleFilterField({
  children,
  inline = false,
  label,
}: {
  children: ReactNode
  inline?: boolean
  label: string
}) {
  return (
    <div className={cn("flex gap-2", inline ? "items-center" : "flex-col")}>
      <span className="shrink-0 font-medium text-muted-foreground text-xs">
        {label}
      </span>
      {children}
    </div>
  )
}

/** A single-choice facet: one option is always selected, so tapping the
 *  active one again is ignored rather than clearing it. */
export function ConsoleFilterToggle<Value extends string>({
  inline,
  label,
  onValueChange,
  options,
  value,
}: {
  inline?: boolean
  label?: string
  onValueChange: (value: Value) => void
  options: readonly { label: string; value: Value }[]
  value: Value
}) {
  const toggle = (
    <ToggleGroup
      aria-label={label}
      className="flex-wrap justify-start"
      onValueChange={(next) => {
        if (next !== "") {
          onValueChange(next as Value)
        }
      }}
      type="single"
      value={value}
      variant="outline"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )

  return label === undefined ? (
    toggle
  ) : (
    <ConsoleFilterField inline={inline} label={label}>
      {toggle}
    </ConsoleFilterField>
  )
}
