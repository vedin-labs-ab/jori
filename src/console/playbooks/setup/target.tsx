import { type SlackDeliveryTarget } from "@contracts/playbooks/delivery"
import { IntegrationOptionPicker } from "@/console/integrations/options"

type SlackChannel = Extract<SlackDeliveryTarget, { kind: "channel" }>

export function SlackChannelField({
  disabled = false,
  onChange,
  tenantId,
  value,
}: {
  disabled?: boolean
  onChange: (target: SlackChannel | undefined) => void
  tenantId: string
  value: SlackChannel | undefined
}) {
  const selected =
    value === undefined
      ? null
      : {
          value: value.id,
          label: `#${value.label}`,
        }

  return (
    <IntegrationOptionPicker
      ariaLabel="Slack channel"
      clearLabel="Clear channel"
      disabled={disabled}
      emptyLabel="No channels found."
      onChange={(option) =>
        onChange(
          option === null
            ? undefined
            : {
                kind: "channel",
                id: option.value,
                label: option.label.replace(/^#/, ""),
              }
        )
      }
      placeholder="Search channels…"
      source="slack.channels"
      tenantId={tenantId}
      value={selected}
    />
  )
}
