import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { ArrowUpRight, Play, Settings2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { type PlaybookActions, pendingActionKind } from "./enable"
import { ConnectButton, PlaybookSetupDialog, SetupControls } from "./setup"
import {
  connectMissingLabel,
  type PlaybookEnabledRow,
  type PlaybookListRow,
  planPlaybookEnable,
  playbookUpdateAvailable,
} from "./state"

export function PlaybookControls({
  actions,
  definition,
  row,
  tenantId,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  row: PlaybookListRow | undefined
  tenantId: string
}) {
  if (row === undefined) {
    return <Skeleton className="h-7 w-full" />
  }

  if (row.enabled === null) {
    return (
      <SetupControls
        actions={actions}
        definition={definition}
        row={row}
        tenantId={tenantId}
      />
    )
  }

  return (
    <EnabledControls
      actions={actions}
      definition={definition}
      enabled={row.enabled}
      row={row}
      tenantId={tenantId}
    />
  )
}

/** Header on/off switch for an enabled playbook. */
export function PlaybookSwitch({
  actions,
  definition,
  enabled,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  enabled: PlaybookEnabledRow
}) {
  const active = enabled.status === "active"
  const pendingKind = pendingActionKind(actions, definition)

  return (
    <>
      <span className="text-xs text-muted-foreground">
        {active ? "On" : "Paused"}
      </span>
      <Switch
        aria-label={`${definition.title} enabled`}
        checked={active}
        disabled={pendingKind !== undefined}
        onCheckedChange={(checked) =>
          void actions.setPaused(definition, enabled.automationId, !checked)
        }
      />
    </>
  )
}

function EnabledControls({
  actions,
  definition,
  enabled,
  row,
  tenantId,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  enabled: PlaybookEnabledRow
  row: PlaybookListRow
  tenantId: string
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const pendingKind = pendingActionKind(actions, definition)
  const plan = planPlaybookEnable(row.slots)
  const canEditSetup =
    enabled.missing.length === 0 &&
    enabled.setup !== null &&
    plan.kind !== "connect"

  return (
    <div className="flex w-full items-center justify-between gap-2">
      {enabled.missing.length > 0 ? (
        <ConnectButton label={connectMissingLabel(enabled.missing)} />
      ) : (
        <Button
          disabled={pendingKind !== undefined}
          onClick={() => void actions.runNow(definition, enabled.automationId)}
          variant="outline"
        >
          {pendingKind === "run" ? <Spinner /> : <Play />} Run now
        </Button>
      )}
      <span className="flex items-center gap-2">
        {canEditSetup ? (
          <EditSetupButton
            definition={definition}
            enabled={enabled}
            onOpen={() => setIsEditOpen(true)}
            pendingKind={pendingKind}
          />
        ) : null}
        <Button
          disabled={pendingKind !== undefined}
          onClick={() => void actions.edit(definition, enabled.automationId)}
          onFocus={actions.preloadEdit}
          onPointerEnter={actions.preloadEdit}
          variant="outline"
        >
          View {pendingKind === "edit" ? <Spinner /> : <ArrowUpRight />}
        </Button>
      </span>
      {isEditOpen && plan.kind !== "connect" ? (
        <PlaybookSetupDialog
          actions={actions}
          definition={definition}
          enabled={enabled}
          onOpenChange={setIsEditOpen}
          open={isEditOpen}
          plan={plan}
          row={row}
          tenantId={tenantId}
        />
      ) : null}
    </div>
  )
}

/** Reopens the setup dialog on the stored configuration; once the catalog
 *  moves past this enablement it becomes the Update call to action. */
function EditSetupButton({
  definition,
  enabled,
  onOpen,
  pendingKind,
}: {
  definition: PlaybookDefinition
  enabled: PlaybookEnabledRow
  onOpen: () => void
  pendingKind: ReturnType<typeof pendingActionKind>
}) {
  const updateAvailable = playbookUpdateAvailable(definition, enabled)

  return (
    <Button
      disabled={pendingKind !== undefined}
      onClick={onOpen}
      variant={updateAvailable ? "default" : "outline"}
    >
      {pendingKind === "reconfigure" ? <Spinner /> : <Settings2 />}
      {updateAvailable ? "Update" : "Edit setup"}
    </Button>
  )
}
