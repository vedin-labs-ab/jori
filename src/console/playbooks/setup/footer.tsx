import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { Play, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { type PlaybookActionKind } from "../pending"
import { type PlaybookEnabledRow, playbookUpdateAvailable } from "../state"

type PendingKind = PlaybookActionKind | undefined

export type SetupSubmit = {
  advanced: () => void
  enable: () => void
  trial: () => void
  save: () => void
}

/** Enable-mode actions for a fresh setup; a single save for an edit. */
export function SetupFooter({
  advancedDisabled,
  canSubmit,
  definition,
  enabled,
  onPreloadEdit,
  pendingKind,
  submit,
}: {
  advancedDisabled: boolean
  canSubmit: boolean
  definition: PlaybookDefinition
  enabled?: PlaybookEnabledRow
  onPreloadEdit: () => void
  pendingKind: PendingKind
  submit: SetupSubmit
}) {
  if (enabled === undefined) {
    return (
      <EnableFooter
        advancedDisabled={advancedDisabled}
        canSubmit={canSubmit}
        onAdvanced={submit.advanced}
        onEnable={submit.enable}
        onPreloadEdit={onPreloadEdit}
        onTrial={submit.trial}
        pendingKind={pendingKind}
      />
    )
  }

  return (
    <DialogFooter>
      <Button disabled={!canSubmit} onClick={submit.save}>
        {pendingKind === "reconfigure" ? <Spinner /> : null}
        {playbookUpdateAvailable(definition, enabled)
          ? "Update playbook"
          : "Save changes"}
      </Button>
    </DialogFooter>
  )
}

function EnableFooter({
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
  pendingKind: PendingKind
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
          variant="ghost"
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

/** What saving means for an existing enablement: version updates refresh
 *  the rendered instructions, and a customized app is never touched. */
export function EditSetupNotes({
  definition,
  enabled,
}: {
  definition: PlaybookDefinition
  enabled?: PlaybookEnabledRow
}) {
  if (enabled?.setup == null) {
    return null
  }

  const updateAvailable = playbookUpdateAvailable(definition, enabled)
  const customized = enabled.app?.customized === true

  if (!updateAvailable && !customized) {
    return null
  }

  return (
    <div className="grid gap-1 text-muted-foreground text-xs">
      {updateAvailable ? (
        <p>
          A newer version of this playbook is available. Saving re-renders its
          instructions{definition.app === undefined ? "" : " and app"} from your
          settings.
        </p>
      ) : null}
      {customized ? (
        <p>
          Your {definition.app?.title ?? "playbook"} app has custom changes —
          Milo keeps them and never overwrites a customized app.
        </p>
      ) : null}
    </div>
  )
}
