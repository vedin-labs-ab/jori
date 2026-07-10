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
  const [providerIndex, setProviderIndex] = useState(0)
  const delivery = useDeliverySetup(definition, row.delivery)
  const destination = delivery.value
  const pendingKind = pendingActionKind(actions, definition)

  const choices =
    plan.kind === "choose" ? plan.options[providerIndex].choices : plan.choices
  // A pending action locks the whole dialog until it settles.
  const isBusy = pendingKind !== undefined
  // An open edit holds submission: the user saves or cancels first.
  const canSubmit = destination !== undefined && !isBusy && !delivery.editing

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

  function openAdvanced() {
    if (destination === undefined) {
      return
    }
    // The builder stacks on top; this dialog stays beneath as the way back
    // and only closes once an automation is actually created from it.
    void actions.openAdvanced(definition, choices, destination, () =>
      onOpenChange(false)
    )
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (next || !isBusy) {
          onOpenChange(next)
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set up {definition.title}</DialogTitle>
          <DialogDescription>{definition.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <PlaybookMeta definition={definition} row={row} />
          <PlaybookCustomizations
            delivery={{ ...delivery, tenantId }}
            disabled={isBusy}
            onProviderIndexChange={setProviderIndex}
            plan={plan}
            providerIndex={providerIndex}
          />
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            disabled={destination === undefined || isBusy}
            onClick={openAdvanced}
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

/**
 * Delivery state for the setup dialog: `value` is the committed destination —
 * the field only reports saved, valid choices, so an unsaved edit never leaks
 * into the actions — and `editing` flags an open edit.
 */
function useDeliverySetup(
  definition: PlaybookDefinition,
  availableKinds: DeliveryKind[]
) {
  const defaultKind: DeliveryKind = availableKinds.includes(
    definition.delivery.default
  )
    ? definition.delivery.default
    : (availableKinds[0] ?? "email")
  const [value, setValue] = useState<DeliveryChoice | undefined>(
    defaultKind === "email" ? { kind: "email" } : undefined
  )
  const [editing, setEditing] = useState(defaultKind !== "email")

  return {
    availableKinds,
    defaultKind,
    editing,
    onChange: setValue,
    onEditingChange: setEditing,
    value,
  }
}
