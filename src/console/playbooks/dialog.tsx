import { useUser } from "@clerk/tanstack-react-start"
import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import {
  type DeliveryChoice,
  type DeliveryKind,
  deliveryKindLabels,
} from "@contracts/playbooks/delivery"
import { describePlaybookSchedule } from "@contracts/playbooks/schedule"
import { Play } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { type SlackChannel, SlackChannelField } from "./channel"
import { type PlaybookActions, pendingActionKind } from "./enable"
import { type PlaybookEnablePlan, type PlaybookListRow } from "./state"

/** Confirm-and-customize setup for an unenabled playbook. */
export function PlaybookSetupDialog({
  actions,
  definition,
  onOpenChange,
  open,
  plan,
  row,
  tenantId,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  onOpenChange: (open: boolean) => void
  open: boolean
  // A resolvable plan (never "connect": the card gates on connection first).
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>
  row: PlaybookListRow
  tenantId: string
}) {
  const availableKinds = row.delivery
  const [familyIndex, setFamilyIndex] = useState(0)
  const [kind, setKind] = useState<DeliveryKind>(
    availableKinds.includes(definition.delivery.default)
      ? definition.delivery.default
      : (availableKinds[0] ?? "email")
  )
  const [channel, setChannel] = useState<SlackChannel>()
  const pendingKind = pendingActionKind(actions, definition)

  const choices =
    plan.kind === "choose" ? plan.options[familyIndex].choices : plan.choices
  const destination = toDestination(kind, channel)
  const canSubmit = destination !== undefined && pendingKind === undefined

  function submit(action: PlaybookActions["enable"], close: boolean) {
    if (destination === undefined) {
      return
    }
    void action(definition, choices, destination).then(() => {
      if (close) {
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set up {definition.title}</DialogTitle>
          <DialogDescription>
            Runs {lowercaseFirst(describePlaybookSchedule(definition.schedule))}
            . {definition.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {plan.kind === "choose" ? (
            <ProviderField
              onValueChange={setFamilyIndex}
              options={plan.options.map((option) => option.label)}
              value={familyIndex}
            />
          ) : null}
          <DeliveryField
            availableKinds={availableKinds}
            channel={channel}
            kind={kind}
            onChannelChange={setChannel}
            onKindChange={setKind}
            tenantId={tenantId}
          />
        </div>

        <DialogFooter>
          <Button
            disabled={!canSubmit}
            onClick={() => submit(actions.trial, false)}
            variant="outline"
          >
            {pendingKind === "trial" ? <Spinner /> : <Play />} Try once
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => submit(actions.enable, true)}
          >
            {pendingKind === "enable" ? <Spinner /> : null} Enable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeliveryField({
  availableKinds,
  channel,
  kind,
  onChannelChange,
  onKindChange,
  tenantId,
}: {
  availableKinds: DeliveryKind[]
  channel: SlackChannel | undefined
  kind: DeliveryKind
  onChannelChange: (channel: SlackChannel | undefined) => void
  onKindChange: (kind: DeliveryKind) => void
  tenantId: string
}) {
  const email = useUser().user?.primaryEmailAddress?.emailAddress

  return (
    <div className="grid gap-2">
      <Label className="font-normal text-xs">Deliver to</Label>
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

function ProviderField({
  onValueChange,
  options,
  value,
}: {
  onValueChange: (index: number) => void
  options: string[]
  value: number
}) {
  return (
    <div className="grid gap-2">
      <Label className="font-normal text-xs">Accounts</Label>
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
    </div>
  )
}

function toDestination(
  kind: DeliveryKind,
  channel: SlackChannel | undefined
): DeliveryChoice | undefined {
  if (kind === "email") {
    return { kind: "email" }
  }

  return channel === undefined ? undefined : { kind: "slack", ...channel }
}

function lowercaseFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1)
}
