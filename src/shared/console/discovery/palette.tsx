import { useRef } from "react"
import { Command, CommandDialog, CommandInput } from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { useShortcuts } from "@/shared/shortcuts"
import { pageBindings, resultKeys, searchKeys } from "./bindings"
import { Results } from "./list"
import { type PaletteProps } from "./types"

export function SearchPalette(props: PaletteProps) {
  const scope = useRef<HTMLDivElement>(null)
  useShortcuts(
    [
      {
        shortcut: searchKeys,
        allowInInput: true,
        run: () => props.onOpenChange(false),
      },
      ...pageBindings(props.onNavigate, true),
      ...props.state.hits.slice(0, 5).map((hit, index) => ({
        shortcut: resultKeys(index),
        allowInInput: true,
        run: () => props.onOpenHit(hit),
      })),
    ],
    { enabled: props.open, scope }
  )
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
          onValueChange={props.onQueryChange}
          placeholder="Search by name or content…"
          value={props.query}
        />
        <Results {...props} />
        <Footer partial={props.state.partial} />
      </Command>
    </CommandDialog>
  )
}

function Footer({ partial }: { partial: boolean }) {
  return (
    <div className="-mx-1 -mb-1 mt-1 flex min-h-9 items-center gap-3 border-t px-3 text-[0.625rem] text-muted-foreground">
      <span className="shrink-0">
        <Kbd>↑</Kbd> <Kbd>↓</Kbd> choose
      </span>
      <span className="shrink-0">
        <Kbd>↵</Kbd> open
      </span>
      <span className="shrink-0">
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
        {partial ? "Incomplete results" : ""}
      </span>
    </div>
  )
}
