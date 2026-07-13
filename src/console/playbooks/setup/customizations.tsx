import { type ComponentProps } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PlaybookSection } from "../meta"
import { type PlaybookEnablePlan } from "../state"
import { DeliveryField } from "./delivery/field"

export function PlaybookAccounts({
  disabled = false,
  plan,
  providerIndex,
  onProviderIndexChange,
}: {
  disabled?: boolean
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>
  providerIndex: number
  onProviderIndexChange: (index: number) => void
}) {
  if (plan.kind !== "choose") {
    return null
  }

  return (
    <PlaybookSection label="Accounts">
      <OptionToggle
        disabled={disabled}
        onValueChange={onProviderIndexChange}
        options={plan.options.map((option) => option.label)}
        value={providerIndex}
      />
    </PlaybookSection>
  )
}

export function PlaybookDelivery({
  delivery,
  disabled = false,
}: {
  delivery: ComponentProps<typeof DeliveryField>
  disabled?: boolean
}) {
  return (
    <PlaybookSection label="Deliver to">
      <DeliveryField {...delivery} disabled={disabled} />
    </PlaybookSection>
  )
}

function OptionToggle({
  disabled,
  onValueChange,
  options,
  value,
}: {
  disabled: boolean
  onValueChange: (index: number) => void
  options: string[]
  value: number
}) {
  return (
    <ToggleGroup
      className="justify-start"
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== "") {
          onValueChange(Number(next))
        }
      }}
      type="single"
      value={String(value)}
      variant="outline"
    >
      {options.map((option, index) => (
        <ToggleGroupItem key={option} value={String(index)}>
          {option}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
