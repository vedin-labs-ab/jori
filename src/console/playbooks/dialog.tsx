import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import {
  type DeliveryChoice,
  type DeliveryKind,
} from "@contracts/playbooks/delivery"
import {
  type PlaybookOptionValues,
  resolvePlaybookOptions,
} from "@contracts/playbooks/options"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { Play, Settings2 } from "lucide-react"
import { useMemo, useState } from "react"
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
  const { options, optionFields } = useOptionsSetup(definition)
  const meetingsHint = useMeetingsHint(definition, tenantId)

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
    void action(definition, choices, destination, options).then(() => {
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
    void actions.openAdvanced(definition, choices, destination, options, () =>
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
          <PlaybookMeta definition={definition} options={options} row={row} />
          <PlaybookCustomizations
            delivery={{ ...delivery, tenantId }}
            disabled={isBusy}
            onProviderIndexChange={setProviderIndex}
            options={
              optionFields === undefined
                ? undefined
                : { ...optionFields, hints: { meetings: meetingsHint } }
            }
            plan={plan}
            providerIndex={providerIndex}
          />
        </div>

        <SetupDialogFooter
          advancedDisabled={destination === undefined || isBusy}
          canSubmit={canSubmit}
          onAdvanced={openAdvanced}
          onEnable={() => submit(actions.enable, true)}
          onPreloadEdit={actions.preloadEdit}
          onTrial={() => submit(actions.trial, false)}
          pendingKind={pendingKind}
        />
      </DialogContent>
    </Dialog>
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
 * Option state for the setup dialog: raw picks overlay the catalog defaults,
 * and the resolved record drives the fields, the cadence preview, and what
 * the actions submit.
 */
function useOptionsSetup(definition: PlaybookDefinition) {
  const [picks, setPicks] = useState<PlaybookOptionValues>({})
  const options = useMemo(
    () => resolvePlaybookOptions(definition.options, picks),
    [definition.options, picks]
  )
  const fields = definition.options

  return {
    options,
    optionFields:
      fields === undefined
        ? undefined
        : {
            fields,
            values: options,
            onChange: (key: string, value: string | number) =>
              setPicks((current) => ({ ...current, [key]: value })),
          },
  }
}

/**
 * Grounds a Meetings scope field in the organization's actual domains so
 * "Internal" is concrete. The dialog only displays — domains are managed on
 * the Context page, which the caption links to.
 */
function useMeetingsHint(definition: PlaybookDefinition, tenantId: string) {
  const hasMeetings =
    definition.options?.some((field) => field.key === "meetings") === true
  const profile = useQuery(
    api.organization.profile.get,
    hasMeetings ? { tenantId } : "skip"
  )

  if (!hasMeetings) {
    return undefined
  }

  const domains = [
    ...new Set([
      ...(profile?.domains ?? []),
      ...(profile?.declared?.domains ?? []),
    ]),
  ]
  const hasDomains = domains.length > 0

  return (
    <p className="text-muted-foreground">
      {describeInternal(domains)}
      {" · "}
      <Link
        className="underline underline-offset-2 hover:text-foreground"
        to="/context"
      >
        {hasDomains ? "Manage" : "Set up in Context"}
      </Link>
    </p>
  )
}

// Name the single domain while it stays concrete; collapse to a count once a
// list would get noisy. The Manage link reveals the full list either way.
function describeInternal(domains: string[]) {
  if (domains.length === 0) {
    return "Internal is based on your organization's domains"
  }

  return domains.length === 1
    ? `Internal: anyone at ${domains[0]}`
    : `Internal: ${domains.length} domains`
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
