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
      contentRef={scope}
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
      <Command
        className="[&_[cmdk-item]>svg:first-child]:text-muted-foreground [&_[cmdk-item]:is(:hover,[data-selected=true])>svg:first-child]:text-foreground"
        shouldFilter={false}
        vimBindings={false}
      >
        <CommandInput
          aria-busy={props.state.status === "loading"}
          aria-label="Search workspace"
          maxLength={200}
          onPointerDown={() => setPinnedGuide(false)}
          onValueChange={(value) => {
            setPinnedGuide(false)
            props.onQueryChange(value)
          }}
          placeholder="Search by name or content…"
          value={props.query}
        />
        <CommandList className="h-80 max-h-[50dvh] [&_[cmdk-list-sizer]]:flex [&_[cmdk-list-sizer]]:min-h-full [&_[cmdk-list-sizer]]:flex-col">
          {guide ? (
            <div className="p-3">
              <PageShortcuts held={!pinnedGuide} />
            </div>
          ) : (
            <Results {...props} />
          )}
        </CommandList>
        <Footer
          partial={props.state.partial}
          guide={guide ? (heldGuide ? "held" : "pinned") : undefined}
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
  guide: "held" | "pinned" | undefined
  onGuide: () => void
}) {
  return (
    <div className="-mx-1 -mb-1 mt-1 flex min-h-9 items-center gap-3 border-t px-3 text-[0.625rem] text-muted-foreground">
      {guide ? (
        <span className="ml-auto">
          {guide === "held" ? "Release keys to return" : "Type to search"}
        </span>
      ) : (
        <>
          <span className="hidden shrink-0 sm:inline">
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> Choose
          </span>
          <span className="hidden shrink-0 sm:inline">
            <Kbd>↵</Kbd> Open
          </span>
          <span className="hidden shrink-0 sm:inline">
            <Kbd>esc</Kbd> Close
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
            {partial ? "Incomplete results" : ""}
          </span>
          <Button
            aria-expanded={false}
            className="h-auto shrink-0 p-0 text-[0.625rem] text-muted-foreground"
            onClick={onGuide}
            size="sm"
            title="Hold Option/Alt and Shift to preview page shortcuts"
            variant="ghost"
          >
            <Kbd>{shortcutLabel(pageKeys(""))}</Kbd> Shortcuts
          </Button>
        </>
      )}
    </div>
  )
}
