import { type RefObject, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { useShortcuts } from "@/shared/shortcuts"
import { useHeldModifiers } from "@/shared/shortcuts/hold"
import { shortcutLabel } from "@/shared/shortcuts/keys"
import { pageBindings, pageKeys, resultKeys, searchKeys } from "./bindings"
import { PageShortcuts } from "./guide"
import { Results } from "./list"
import { type PaletteProps } from "./types"

export function SearchPalette(props: PaletteProps) {
  const scope = useRef<HTMLDivElement>(null)
  const [pinnedGuide, setPinnedGuide] = useState(false)
  useEffect(() => {
    if (!props.open) {
      setPinnedGuide(false)
    }
  }, [props.open])
  const heldGuide = useHeldModifiers(pageKeys(""), {
    enabled: props.open,
    scope,
    allowInInput: true,
  })
  const guide = pinnedGuide || heldGuide
  usePaletteShortcuts(props, scope, guide)
  return (
    <CommandDialog
      className="sm:max-w-xl"
      description="Search by name or content. Use the arrow keys to choose a result and Enter to open it."
      onOpenChange={props.onOpenChange}
      open={props.open}
      title={
        props.organizationName
          ? `Search in ${props.organizationName}`
          : "Search workspace"
      }
    >
      {/* Keep Ctrl+K available for toggling search on Windows and Linux. */}
      <Command ref={scope} shouldFilter={false} vimBindings={false}>
        <CommandInput
          aria-busy={props.state.status === "loading"}
          aria-label="Search workspace"
          maxLength={200}
          onValueChange={(value) => {
            setPinnedGuide(false)
            props.onQueryChange(value)
          }}
          placeholder="Search by name or content…"
          value={props.query}
        />
        {guide ? (
          <CommandList className="h-80 max-h-[50dvh] p-3">
            <PageShortcuts held={!pinnedGuide} />
          </CommandList>
        ) : (
          <Results {...props} />
        )}
        <Footer
          partial={props.state.partial}
          guide={guide}
          onGuide={() => {
            setPinnedGuide((value) => !value)
            scope.current?.querySelector("input")?.focus()
          }}
        />
      </Command>
    </CommandDialog>
  )
}

function usePaletteShortcuts(
  props: PaletteProps,
  scope: RefObject<HTMLDivElement | null>,
  guide: boolean
) {
  useShortcuts(
    [
      {
        shortcut: searchKeys,
        allowInInput: true,
        run: () => props.onOpenChange(false),
      },
      ...pageBindings(props.onNavigate, true),
      ...(guide ? [] : props.state.hits).slice(0, 5).map((hit, index) => ({
        shortcut: resultKeys(index),
        allowInInput: true,
        run: () => props.onOpenHit(hit),
      })),
    ],
    { enabled: props.open, scope }
  )
}

function Footer({
  partial,
  guide,
  onGuide,
}: {
  partial: boolean
  guide: boolean
  onGuide: () => void
}) {
  return (
    <div className="-mx-1 -mb-1 mt-1 flex min-h-9 items-center gap-3 border-t px-3 text-[0.625rem] text-muted-foreground">
      {!guide ? (
        <>
          <span className="hidden shrink-0 sm:inline">
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> choose
          </span>
          <span className="hidden shrink-0 sm:inline">
            <Kbd>↵</Kbd> open
          </span>
        </>
      ) : null}
      <span className="hidden shrink-0 sm:inline">
        <Kbd>esc</Kbd> close
      </span>
      <span
        aria-live="polite"
        className="ml-auto"
        title={
          partial
            ? "Some results may be missing. Try searching again."
            : undefined
        }
      >
        {partial && !guide ? "Incomplete results" : ""}
      </span>
      <Button
        aria-expanded={guide}
        className="h-auto shrink-0 p-0 text-[0.625rem] text-muted-foreground"
        onClick={onGuide}
        size="sm"
        title={
          guide
            ? "Return to search results"
            : "Hold Option/Alt and Shift to preview page shortcuts"
        }
        variant="ghost"
      >
        {guide ? "Back to results" : "Shortcuts"}
        {!guide ? <Kbd>{shortcutLabel(pageKeys(""))}</Kbd> : null}
      </Button>
    </div>
  )
}
