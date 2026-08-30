import {
  type Visibility,
  type VisibilityMode,
  visibilityModeLabels,
  visibilityModes,
} from "@contracts/permissions/visibility"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldHelp } from "@/shared/field"
import { VisibilityIcon } from "./badge"
import { GrantPicker } from "./grants"
import { usePeopleOptions, useTeamOptions } from "./options"

// The one access control every material and folder shares, in creation
// dialogs and settings alike: a compact mode select, the grant pickers it
// reveals, and the confirmation that gates going public.

export function VisibilityField({
  allowPublic = true,
  help,
  id,
  noun,
  onChange,
  organizationId,
  value,
}: {
  /** Automations have no anonymous surface, so they omit the public mode. */
  allowPublic?: boolean
  /** Extra per-subject sentence appended to the field help. */
  help?: string
  id: string
  noun: string
  onChange: (visibility: Visibility) => void
  organizationId: string
  value: Visibility
}) {
  const [confirmingPublic, setConfirmingPublic] = useState(false)
  const modes = allowPublic
    ? visibilityModes
    : visibilityModes.filter((mode) => mode !== "public")

  const selectMode = (mode: VisibilityMode) => {
    if (mode === value.mode) {
      return
    }

    if (mode === "public") {
      setConfirmingPublic(true)

      return
    }

    onChange(withMode(mode, value))
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>Sharing</Label>
        <FieldHelp label="Sharing help">
          <p>
            Who can see this {noun}. Whoever can see it can also use and edit
            it; you always keep access to what you own.
          </p>
          {allowPublic ? (
            <p>
              Public makes it readable by anyone with the link, without signing
              in. Editing always requires organization access.
            </p>
          ) : null}
          {help === undefined ? null : <p>{help}</p>}
        </FieldHelp>
      </div>
      <Select onValueChange={selectMode} value={value.mode}>
        <SelectTrigger className="w-full" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {modes.map((mode) => (
            <SelectItem key={mode} value={mode}>
              <VisibilityIcon className="size-4" mode={mode} />
              {visibilityModeLabels[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <GrantFields
        onChange={onChange}
        organizationId={organizationId}
        value={value}
      />
      <PublicConfirmation
        noun={noun}
        onCancel={() => setConfirmingPublic(false)}
        onConfirm={() => {
          setConfirmingPublic(false)
          onChange({ mode: "public" })
        }}
        open={confirmingPublic}
      />
    </div>
  )
}

function GrantFields({
  onChange,
  organizationId,
  value,
}: {
  onChange: (visibility: Visibility) => void
  organizationId: string
  value: Visibility
}) {
  const people = usePeopleOptions(organizationId)
  const teams = useTeamOptions(organizationId)

  if (value.mode === "people") {
    return (
      <GrantPicker
        emptyLabel="Choose people…"
        label="Choose people"
        onToggle={(personId) =>
          onChange({
            mode: "people",
            personIds: toggle(value.personIds, personId),
          })
        }
        options={people}
        placeholder="Search members…"
        selected={value.personIds}
      />
    )
  }

  if (value.mode === "teams") {
    return (
      <GrantPicker
        emptyLabel="Choose teams…"
        label="Choose teams"
        onToggle={(teamId) =>
          onChange({ mode: "teams", teamIds: toggle(value.teamIds, teamId) })
        }
        options={teams}
        placeholder="Search teams…"
        selected={value.teamIds}
      />
    )
  }

  return null
}

/** Going public is the one selection that must not happen in passing. */
function PublicConfirmation({
  noun,
  onCancel,
  onConfirm,
  open,
}: {
  noun: string
  onCancel: () => void
  onConfirm: () => void
  open: boolean
}) {
  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
      open={open}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Make this {noun} public?</AlertDialogTitle>
          <AlertDialogDescription>
            Anyone with the link can view this {noun} — no sign-in required.
            Editing still requires organization access.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Make public</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function withMode(
  mode: Exclude<VisibilityMode, "public">,
  previous: Visibility
): Visibility {
  if (mode === "people") {
    return {
      mode,
      personIds: previous.mode === "people" ? previous.personIds : [],
    }
  }

  if (mode === "teams") {
    return { mode, teamIds: previous.mode === "teams" ? previous.teamIds : [] }
  }

  return { mode }
}

function toggle(values: readonly string[], value: string) {
  return values.includes(value)
    ? values.filter((existing) => existing !== value)
    : [...values, value]
}
