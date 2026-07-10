import { type ComponentProps } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DeliveryField } from "./delivery"
import { PlaybookSection } from "./meta"
import { type PlaybookEnablePlan } from "./state"

/**
 * Every knob a playbook exposes at setup, each a `PlaybookSection` so it flows
 * inline after the Schedule/Tools summary with a matching label. Add a
 * customization by rendering another section here.
 */
export function PlaybookCustomizations({
  delivery,
  plan,
  providerIndex,
  onProviderIndexChange,
}: {
  delivery: ComponentProps<typeof DeliveryField>
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>
  providerIndex: number
  onProviderIndexChange: (index: number) => void
}) {
  return (
    <>
      {plan.kind === "choose" ? (
        <PlaybookSection label="Accounts">
          <OptionToggle
            onValueChange={onProviderIndexChange}
            options={plan.options.map((option) => option.label)}
            value={providerIndex}
          />
        </PlaybookSection>
      ) : null}
      <PlaybookSection label="Deliver to">
        <DeliveryField {...delivery} />
      </PlaybookSection>
    </>
  )
}

/** Single-select toggle over string options addressed by index. */
function OptionToggle({
  onValueChange,
  options,
  value,
}: {
  onValueChange: (index: number) => void
  options: string[]
  value: number
}) {
  return (
    <ToggleGroup
      className="justify-start"
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
