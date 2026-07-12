import { type SlackDeliveryTarget } from "@contracts/playbooks/delivery"
import { IntegrationOptionPicker } from "@/console/integrations/picker"

export function SlackTargetField({
  disabled = false,
  kind,
  onChange,
  tenantId,
  value,
}: {
  disabled?: boolean
  kind: SlackDeliveryTarget["kind"]
  onChange: (target: SlackDeliveryTarget | undefined) => void
  tenantId: string
  value: SlackDeliveryTarget | undefined
}) {
  const channel = kind === "channel"
  const selected =
    value === undefined
      ? null
      : {
          value: value.id,
          label: channel ? `#${value.label}` : value.label,
        }

  return (
    <IntegrationOptionPicker
      ariaLabel={channel ? "Slack channel" : "Slack person"}
      clearLabel={channel ? "Clear channel" : "Clear person"}
      disabled={disabled}
      emptyLabel={channel ? "No channels found." : "No people found."}
      onChange={(option) =>
        onChange(
          option === null
            ? undefined
            : {
                kind,
                id: option.value,
                label: channel ? option.label.replace(/^#/, "") : option.label,
              }
        )
      }
      placeholder={channel ? "Search channels…" : "Search people…"}
      source={channel ? "slack.channels" : "slack.users"}
      tenantId={tenantId}
      value={selected}
    />
  )
}
