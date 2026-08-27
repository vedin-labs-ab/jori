import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import {
  type DeliveryChoice,
  type DeliverySetup,
} from "@contracts/playbooks/delivery"
import { useMutation } from "convex/react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "../../../../convex/_generated/api"
import { ScopeIcon } from "../../shared/details"
import { showErrorToast } from "../../shared/error"
import { type PlaybookActions, pendingActionKind } from "../enable"
import {
  type PlaybookEnabledRow,
  type PlaybookEnablePlan,
  type PlaybookListRow,
} from "../state"
import { useOptionsSetup } from "./configuration/state"
import { EditSetupNotes, SetupFooter, type SetupSubmit } from "./footer"
import { SetupDialogSections } from "./form"

/** Confirm-and-customize setup: enabling a playbook, or — with `enabled`
 *  present — editing and updating an existing enablement in place. */
export function PlaybookSetupDialog(props: PlaybookSetupDialogProps) {
  const { actions, definition, enabled, onOpenChange, open, plan, row } = props
  const {
    canSubmit,
    choices,
    delivery,
    destination,
    isBusy,
    options,
    optionsIssue,
    pendingKind,
    providerIndex,
    setProviderIndex,
    setupFields,
  } = useSetupState(props)
  const submit = setupActions({ ...props, choices, destination, options })

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
        <SetupDialogHeader
          definition={definition}
          editing={enabled?.setup != null}
        />
        <SetupDialogSections
          choices={choices}
          definition={definition}
          delivery={delivery}
          isBusy={isBusy}
          onProviderIndexChange={setProviderIndex}
          options={options}
          optionsIssue={optionsIssue}
          plan={plan}
          providerIndex={providerIndex}
          row={row}
          setupFields={setupFields}
          organizationId={props.organizationId}
        />
        <EditSetupNotes definition={definition} enabled={enabled} />
        <SetupFooter
          advancedDisabled={
            destination === undefined || isBusy || optionsIssue !== undefined
          }
          canSubmit={canSubmit}
          definition={definition}
          enabled={enabled}
          onPreloadEdit={actions.preloadEdit}
          pendingKind={pendingKind}
          submit={submit}
        />
      </DialogContent>
    </Dialog>
  )
}

export type PlaybookSetupDialogProps = {
  actions: PlaybookActions
  definition: PlaybookDefinition
  /** Present when editing an existing enablement instead of enabling. */
  enabled?: PlaybookEnabledRow
  onOpenChange: (open: boolean) => void
  open: boolean
  // A resolvable plan (never "connect": the card gates on connection first).
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>
  row: PlaybookListRow
  organizationId: string
}

/** Dialog state: option picks, delivery, provider choices, and gating. An
 *  enablement's stored setup seeds every field when editing. */
function useSetupState({
  actions,
  definition,
  enabled,
  plan,
  row,
  organizationId,
}: PlaybookSetupDialogProps) {
  const [providerIndex, setProviderIndex] = useState(0)
  const setup = enabled?.setup ?? undefined
  const delivery = useDeliverySetup(row.delivery, organizationId, setup)
  const pendingKind = pendingActionKind(actions, definition)
  const { options, setupFields } = useOptionsSetup(definition, setup?.options)
  const optionsIssue = definition.validateOptions?.(options)
  const choices =
    setup?.providers ??
    (plan.kind === "choose"
      ? plan.options[providerIndex].choices
      : plan.choices)
  // A pending action locks the whole dialog until it settles; an open edit
  // or an invalid option combination also holds submission.
  const isBusy = pendingKind !== undefined
  const blocked = isBusy || delivery.editing || optionsIssue !== undefined

  return {
    canSubmit: delivery.value !== undefined && !blocked,
    choices,
    delivery,
    destination: delivery.value,
    isBusy,
    options,
    optionsIssue,
    pendingKind,
    providerIndex,
    setProviderIndex,
    setupFields,
  }
}

function setupActions({
  actions,
  choices,
  definition,
  destination,
  enabled,
  onOpenChange,
  options,
}: Pick<
  PlaybookSetupDialogProps,
  "actions" | "definition" | "enabled" | "onOpenChange"
> & {
  choices: Parameters<PlaybookActions["enable"]>[1]
  destination: DeliveryChoice | undefined
  options: Parameters<PlaybookActions["enable"]>[3]
}): SetupSubmit {
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
    save: () => {
      if (destination !== undefined && enabled !== undefined) {
        void actions
          .reconfigure(
            definition,
            enabled.automationId,
            choices,
            destination,
            options
          )
          .then(() => onOpenChange(false))
      }
    },
  }
}

function SetupDialogHeader({
  definition,
  editing,
}: {
  definition: PlaybookDefinition
  editing: boolean
}) {
  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <ScopeIcon
          className="size-4 shrink-0 text-muted-foreground"
          scope={definition.scope}
        />
        <span>
          {editing ? "Edit" : "Set up"} {definition.title}
        </span>
      </DialogTitle>
      <DialogDescription>{definition.description}</DialogDescription>
    </DialogHeader>
  )
}

/**
 * Delivery state for the setup dialog: `value` is the committed destination —
 * the field only reports saved, valid choices, so an unsaved edit never leaks
 * into the actions — and `editing` flags an open edit. An enablement's stored
 * destination wins over the organization-wide recommendation.
 */
function useDeliverySetup(
  setup: DeliverySetup,
  organizationId: string,
  stored?: { destination: DeliveryChoice }
) {
  const savePreference = useMutation(
    api.playbooks.console.saveDeliveryPreference
  )
  const initial = stored?.destination ?? setup.recommended
  const [value, setValue] = useState<DeliveryChoice | undefined>(initial)
  const [editing, setEditing] = useState(initial === undefined)

  return {
    editing,
    onChange: (delivery: DeliveryChoice) => {
      setValue(delivery)
      void savePreference({ organizationId, delivery }).catch((error) =>
        showErrorToast(error, "Couldn't save your delivery preference.")
      )
    },
    onEditingChange: setEditing,
    options: setup.options,
    value,
  }
}
