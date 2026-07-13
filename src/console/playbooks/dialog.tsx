import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import {
  type DeliveryChoice,
  type DeliverySetup,
} from "@contracts/playbooks/delivery"
import { useMutation } from "convex/react"
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
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { useOptionHints, useOptionsSetup } from "./configuration/state"
import { type PlaybookActions, pendingActionKind } from "./enable"
import { SetupDialogSections } from "./form"
import { type PlaybookEnablePlan, type PlaybookListRow } from "./state"

/** Confirm-and-customize setup for an unenabled playbook. */
export function PlaybookSetupDialog(props: PlaybookSetupDialogProps) {
  const { actions, definition, onOpenChange, open, plan, row, tenantId } = props
  const [providerIndex, setProviderIndex] = useState(0)
  const delivery = useDeliverySetup(row.delivery, tenantId)
  const destination = delivery.value
  const pendingKind = pendingActionKind(actions, definition)
  const { options, setupFields } = useOptionsSetup(definition)
  const { hints, optionsIssue } = useOptionHints(definition, tenantId, options)

  const choices =
    plan.kind === "choose" ? plan.options[providerIndex].choices : plan.choices
  // A pending action locks the whole dialog until it settles; an open edit
  // or an invalid option combination also holds submission.
  const isBusy = pendingKind !== undefined
  const blocked = isBusy || delivery.editing || optionsIssue !== undefined
  const canSubmit = destination !== undefined && !blocked
  const submit = setupActions({
    actions,
    choices,
    definition,
    destination,
    onOpenChange,
    options,
  })

  return (
    <Dialog
      onOpenChange={(next) => {
        if (next || !isBusy) {
          onOpenChange(next)
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-xl">
        <SetupDialogHeader definition={definition} />

        <SetupDialogSections
          choices={choices}
          definition={definition}
          delivery={delivery}
          hints={hints}
          isBusy={isBusy}
          onProviderIndexChange={setProviderIndex}
          options={options}
          optionsIssue={optionsIssue}
          plan={plan}
          providerIndex={providerIndex}
          row={row}
          setupFields={setupFields}
          tenantId={tenantId}
        />

        <SetupDialogFooter
          advancedDisabled={
            destination === undefined || isBusy || optionsIssue !== undefined
          }
          canSubmit={canSubmit}
          onAdvanced={submit.advanced}
          onEnable={submit.enable}
          onPreloadEdit={actions.preloadEdit}
          onTrial={submit.trial}
          pendingKind={pendingKind}
        />
      </DialogContent>
    </Dialog>
  )
}

type PlaybookSetupDialogProps = {
  actions: PlaybookActions
  definition: PlaybookDefinition
  onOpenChange: (open: boolean) => void
  open: boolean
  // A resolvable plan (never "connect": the card gates on connection first).
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>
  row: PlaybookListRow
  tenantId: string
}

function setupActions({
  actions,
  choices,
  definition,
  destination,
  onOpenChange,
  options,
}: Pick<PlaybookSetupDialogProps, "actions" | "definition" | "onOpenChange"> & {
  choices: Parameters<PlaybookActions["enable"]>[1]
  destination: DeliveryChoice | undefined
  options: Parameters<PlaybookActions["enable"]>[3]
}) {
  function submit(action: PlaybookActions["enable"], close: boolean) {
    if (destination === undefined) {
      return
    }
    void action(definition, choices, destination, options).then(() => {
      if (close) {
        onOpenChange(false)
      }
    })
  }

  return {
    advanced: () => {
      if (destination !== undefined) {
        void actions.openAdvanced(
          definition,
          choices,
          destination,
          options,
          () => onOpenChange(false)
        )
      }
    },
    enable: () => submit(actions.enable, true),
    trial: () => submit(actions.trial, false),
  }
}

function SetupDialogHeader({ definition }: { definition: PlaybookDefinition }) {
  return (
    <DialogHeader>
      <DialogTitle>Set up {definition.title}</DialogTitle>
      <DialogDescription>{definition.description}</DialogDescription>
    </DialogHeader>
  )
}

function SetupDialogFooter({
  advancedDisabled,
  canSubmit,
  onAdvanced,
  onEnable,
  onPreloadEdit,
  onTrial,
  pendingKind,
}: {
  advancedDisabled: boolean
  canSubmit: boolean
  onAdvanced: () => void
  onEnable: () => void
  onPreloadEdit: () => void
  onTrial: () => void
  pendingKind: ReturnType<typeof pendingActionKind>
}) {
  return (
    <DialogFooter className="sm:justify-between">
      {/* Utilities on the left; Enable stands alone as the call to action. */}
      <div className="flex items-center gap-2">
        <Button
          disabled={advancedDisabled}
          onClick={onAdvanced}
          onPointerEnter={onPreloadEdit}
          type="button"
          variant="secondary"
        >
          {pendingKind === "advanced" ? <Spinner /> : <Settings2 />} Advanced
          settings
        </Button>
        <Button disabled={!canSubmit} onClick={onTrial} variant="secondary">
          {pendingKind === "trial" ? <Spinner /> : <Play />} Try once
        </Button>
      </div>
      <Button disabled={!canSubmit} onClick={onEnable}>
        {pendingKind === "enable" ? <Spinner /> : null} Enable
      </Button>
    </DialogFooter>
  )
}

/**
 * Delivery state for the setup dialog: `value` is the committed destination —
 * the field only reports saved, valid choices, so an unsaved edit never leaks
 * into the actions — and `editing` flags an open edit.
 */
function useDeliverySetup(setup: DeliverySetup, tenantId: string) {
  const savePreference = useMutation(
    api.playbooks.console.saveDeliveryPreference
  )
  const [value, setValue] = useState<DeliveryChoice | undefined>(
    setup.recommended
  )
  const [editing, setEditing] = useState(setup.recommended === undefined)

  return {
    editing,
    onChange: (delivery: DeliveryChoice) => {
      setValue(delivery)
      void savePreference({ tenantId, delivery }).catch((error) =>
        showErrorToast(error, "Couldn't save your delivery preference.")
      )
    },
    onEditingChange: setEditing,
    options: setup.options,
    value,
  }
}
