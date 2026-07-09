import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import {
  type DeliveryChoice,
  type DeliveryKind,
} from "@contracts/playbooks/delivery"
import { Play, Settings2 } from "lucide-react"
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
import { Spinner } from "@/components/ui/spinner"
import { type SlackChannel } from "./channel"
import { PlaybookCustomizations } from "./customizations"
import { type PlaybookActions, pendingActionKind } from "./enable"
import { PlaybookMeta } from "./meta"
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
  const [providerIndex, setProviderIndex] = useState(0)
  const [kind, setKind] = useState<DeliveryKind>(
    availableKinds.includes(definition.delivery.default)
      ? definition.delivery.default
      : (availableKinds[0] ?? "email")
  )
  const [channel, setChannel] = useState<SlackChannel>()
  const pendingKind = pendingActionKind(actions, definition)

  const choices =
    plan.kind === "choose" ? plan.options[providerIndex].choices : plan.choices
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
          <DialogDescription>{definition.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <PlaybookMeta definition={definition} row={row} />
          <PlaybookCustomizations
            delivery={{
              availableKinds,
              channel,
              kind,
              onChannelChange: setChannel,
              onKindChange: setKind,
              tenantId,
            }}
            onProviderIndexChange={setProviderIndex}
            plan={plan}
            providerIndex={providerIndex}
          />
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            disabled={destination === undefined || pendingKind === "advanced"}
            onClick={() => {
              if (destination !== undefined) {
                void actions.openAdvanced(definition, choices, destination)
                onOpenChange(false)
              }
            }}
            onPointerEnter={actions.preloadEdit}
            type="button"
            variant="secondary"
          >
            {pendingKind === "advanced" ? <Spinner /> : <Settings2 />} Advanced
            settings
          </Button>
          <div className="flex items-center gap-2">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
