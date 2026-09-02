import {
  type Visibility,
  type VisibilityMode,
  visibilityModeLabels,
  visibilityModes,
} from "@contracts/visibility"
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
import { type GrantOption, GrantPicker } from "./grants"

// The one access control every material and folder shares, in creation
// dialogs and settings alike: a compact mode select and the grant pickers
// it reveals. Every audience is inside the organization; handing something
// to an outsider is a share link, minted elsewhere.

/** Who the grant pickers can offer; each list is undefined while it
 *  loads. */
export type GrantOptions = {
  people: GrantOption[] | undefined
  teams: GrantOption[] | undefined
}

export function VisibilityField({
  help,
  id,
  noun,
  onChange,
  options,
  value,
}: {
  /** Extra per-subject sentence appended to the field help. */
  help?: string
  id: string
  noun: string
  onChange: (visibility: Visibility) => void
  options: GrantOptions
  value: Visibility
}) {
  const selectMode = (mode: VisibilityMode) => {
    if (mode !== value.mode) {
      onChange(withMode(mode, value))
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>Visibility</Label>
        <FieldHelp label="Visibility help">
          <p>
            Who can see this {noun}. Whoever can see it can also use and edit
            it; you always keep access to what you own.
          </p>
          {help === undefined ? null : <p>{help}</p>}
        </FieldHelp>
      </div>
      <Select onValueChange={selectMode} value={value.mode}>
        <SelectTrigger className="w-full" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {visibilityModes.map((mode) => (
            <SelectItem key={mode} value={mode}>
              <VisibilityIcon className="size-4" mode={mode} />
              {visibilityModeLabels[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <GrantFields onChange={onChange} options={options} value={value} />
    </div>
  )
}

function GrantFields({
  onChange,
  options,
  value,
}: {
  onChange: (visibility: Visibility) => void
  options: GrantOptions
  value: Visibility
}) {
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
        options={options.people}
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
        options={options.teams}
        placeholder="Search teams…"
        selected={value.teamIds}
      />
    )
  }

  return null
}

function withMode(mode: VisibilityMode, previous: Visibility): Visibility {
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
