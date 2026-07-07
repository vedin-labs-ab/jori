import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { ArrowUpRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { type PlaybookActions, pendingActionKind } from "./enable"
import { SetupControls } from "./setup"
import { type PlaybookListRow } from "./state"

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
  enabled: NonNullable<PlaybookListRow["enabled"]>
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
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  enabled: NonNullable<PlaybookListRow["enabled"]>
}) {
  const pendingKind = pendingActionKind(actions, definition)

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Button
        disabled={pendingKind !== undefined}
        onClick={() => void actions.runNow(definition, enabled.automationId)}
        variant="outline"
      >
        {pendingKind === "run" ? <Spinner /> : <Play />} Run now
      </Button>
      <Button
        disabled={pendingKind !== undefined}
        onClick={() => void actions.edit(definition, enabled.automationId)}
        onFocus={actions.preloadEdit}
        onPointerEnter={actions.preloadEdit}
        variant="outline"
      >
        View {pendingKind === "edit" ? <Spinner /> : <ArrowUpRight />}
      </Button>
    </div>
  )
}
