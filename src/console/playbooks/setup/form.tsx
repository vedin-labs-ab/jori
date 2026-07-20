import { type Integration } from "@contracts/integrations"
import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { type PlaybookOptionValues } from "@contracts/playbooks/options"
import { PlaybookAccess, PlaybookSchedule } from "../meta"
import { type PlaybookEnablePlan, type PlaybookListRow } from "../state"
import { PlaybookConfiguration } from "./configuration"
import {
  type useOptionHints,
  type useOptionsSetup,
} from "./configuration/state"
import { PlaybookAccounts, PlaybookDelivery } from "./customizations"

export function SetupDialogSections({
  choices,
  definition,
  delivery,
  hints,
  isBusy,
  onProviderIndexChange,
  options,
  optionsIssue,
  plan,
  providerIndex,
  row,
  setupFields,
  organizationId,
}: {
  choices: Record<string, Integration>
  definition: PlaybookDefinition
  delivery: Omit<
    Parameters<typeof PlaybookDelivery>[0]["delivery"],
    "organizationId"
  >
  hints: ReturnType<typeof useOptionHints>["hints"]
  isBusy: boolean
  onProviderIndexChange: (index: number) => void
  options: PlaybookOptionValues
  optionsIssue?: string
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>
  providerIndex: number
  row: PlaybookListRow
  setupFields: ReturnType<typeof useOptionsSetup>["setupFields"]
  organizationId: string
}) {
  return (
    <div className="grid gap-4">
      {setupFields === undefined ? (
        <PlaybookSchedule definition={definition} options={options} row={row} />
      ) : (
        <PlaybookConfiguration
          {...setupFields}
          disabled={isBusy}
          hints={hints}
          issue={optionsIssue}
        />
      )}
      <PlaybookDelivery
        delivery={{ ...delivery, organizationId }}
        disabled={isBusy}
      />
      <PlaybookAccounts
        disabled={isBusy}
        onProviderIndexChange={onProviderIndexChange}
        plan={plan}
        providerIndex={providerIndex}
      />
      <PlaybookAccess choices={choices} definition={definition} row={row} />
    </div>
  )
}
