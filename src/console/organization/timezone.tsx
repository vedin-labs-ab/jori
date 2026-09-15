import { supportedTimezones } from "@contracts/timezone"
import { type FocusEvent, type MouseEvent, useMemo, useRef } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"

const zones = supportedTimezones()

/**
 * The organization's IANA zone, as a searchable list of everything the
 * platform knows. Callers always pass a zone — the browser's, or the one
 * already declared — so the control is never empty and picking one is a
 * correction rather than a step.
 */
export function TimezonePicker({
  ariaLabel,
  disabled = false,
  id,
  onChange,
  value,
}: {
  /** For surfaces that name the field in a heading rather than a label. */
  ariaLabel?: string
  disabled?: boolean
  id: string
  onChange: (timezone: string) => void
  value: string
}) {
  const selectOnFocus = useSelectOnFocus()

  // A browser may report a zone the platform's own list omits — the older
  // aliases, Asia/Calcutta and its kind. Offer it rather than blank the
  // field on someone whose clock is named the long way round.
  const items = useMemo(
    () => (zones.includes(value) ? zones : [value, ...zones]),
    [value]
  )

  return (
    <Combobox
      disabled={disabled}
      filter={matchesQuery}
      items={items}
      itemToStringLabel={timezoneLabel}
      onValueChange={(timezone: string | null) => {
        if (timezone !== null) {
          onChange(timezone)
        }
      }}
      value={value}
    >
      <ComboboxInput
        aria-label={ariaLabel}
        className="w-full"
        disabled={disabled}
        id={id}
        placeholder="Search timezones"
        {...selectOnFocus}
      />
      <ComboboxContent>
        <ComboboxEmpty>No timezone found.</ComboboxEmpty>
        <ComboboxList>
          {(timezone: string) => (
            <ComboboxItem key={timezone} value={timezone}>
              {timezoneLabel(timezone)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

/** The picker as a labeled form field, for the forms that ask for a zone
 *  rather than the surfaces that already name one. */
export function TimezoneField({
  description,
  disabled = false,
  id,
  onChange,
  value,
}: {
  description: string
  disabled?: boolean
  id: string
  onChange: (timezone: string) => void
  value: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Timezone</Label>
      <TimezonePicker
        disabled={disabled}
        id={id}
        onChange={onChange}
        value={value}
      />
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  )
}

/**
 * The field always arrives filled, so a caret dropped at the end of the
 * current zone turns the next keystroke into "Europe/Stockholmnew" and finds
 * nothing. Taking focus selects the zone instead, so typing searches. The
 * combobox restores the committed zone when the list closes unpicked, so a
 * replaced selection costs nothing.
 */
function useSelectOnFocus() {
  const isTakingFocus = useRef(false)

  return {
    onBlur() {
      isTakingFocus.current = false
    },
    onFocus(event: FocusEvent<HTMLInputElement>) {
      isTakingFocus.current = true
      event.currentTarget.select()
    },
    onMouseUp(event: MouseEvent<HTMLInputElement>) {
      // A click focuses on press and collapses the selection on release.
      // Only the release that brought focus here is worth suppressing;
      // later clicks still place a caret.
      if (isTakingFocus.current) {
        isTakingFocus.current = false
        event.preventDefault()
      }
    },
  }
}

/** Zone names carry underscores where a reader expects spaces. Both the
 *  list and the query are read that way, so "new york" finds New_York. */
function timezoneLabel(timezone: string) {
  return timezone.replaceAll("_", " ")
}

function matchesQuery(timezone: string, query: string) {
  return timezoneLabel(timezone)
    .toLowerCase()
    .includes(timezoneLabel(query).toLowerCase().trim())
}
