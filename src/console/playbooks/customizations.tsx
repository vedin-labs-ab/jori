import { useUser } from "@clerk/tanstack-react-start"
import {
  type DeliveryKind,
  deliveryKindLabels,
} from "@contracts/playbooks/delivery"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { type SlackChannel, SlackChannelField } from "./channel"
import { PlaybookSection } from "./meta"
import { type PlaybookEnablePlan } from "./state"

export type DeliveryState = {
  availableKinds: DeliveryKind[]
  channel: SlackChannel | undefined
  kind: DeliveryKind
  onChannelChange: (channel: SlackChannel | undefined) => void
  onKindChange: (kind: DeliveryKind) => void
  tenantId: string
}

/**
 * Every knob a playbook exposes at setup. Each is a `PlaybookSection`, so its
 * label reads like the Schedule/Tools summary above; a divider sets the two
 * apart. Add a customization by rendering another section here.
 */
export function PlaybookCustomizations({
  delivery,
  plan,
  providerIndex,
  onProviderIndexChange,
}: {
  delivery: DeliveryState
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>
  providerIndex: number
  onProviderIndexChange: (index: number) => void
}) {
  return (
    <>
      <Separator />
      <div className="grid gap-3">
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
          <DeliveryControl {...delivery} />
        </PlaybookSection>
      </div>
    </>
  )
}

function DeliveryControl({
  availableKinds,
  channel,
  kind,
  onChannelChange,
  onKindChange,
  tenantId,
}: DeliveryState) {
  const email = useUser().user?.primaryEmailAddress?.emailAddress

  return (
    <div className="grid gap-2">
      {availableKinds.length > 1 ? (
        <ToggleGroup
          className="justify-start"
          onValueChange={(next) => {
            if (next !== "") {
              onKindChange(next as DeliveryKind)
            }
          }}
          type="single"
          value={kind}
          variant="outline"
        >
          {availableKinds.map((option) => (
            <ToggleGroupItem key={option} value={option}>
              {deliveryKindLabels[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}
      {kind === "email" ? (
        <p className="text-muted-foreground text-xs">
          Emailed to you{email === undefined ? "" : ` at ${email}`}.
        </p>
      ) : (
        <SlackChannelField
          onChange={onChannelChange}
          tenantId={tenantId}
          value={channel}
        />
      )}
    </div>
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
