import { CommandItem, CommandShortcut } from "@/components/ui/command"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { shortcutAria, shortcutLabel } from "@/shared/shortcuts/keys"
import { type ConsoleDestination } from "../shell/location"
import { pageKeys } from "./bindings"
import { Matches } from "./matches"
import { type SearchPage } from "./types"

export function PageResult({
  page,
  query,
  onNavigate,
}: {
  page: SearchPage
  query: string
  onNavigate: (destination: ConsoleDestination) => void
}) {
  const disabled = Boolean(page.disabledReason)
  const item = (
    <CommandItem
      aria-keyshortcuts={
        !disabled && page.shortcut
          ? shortcutAria(pageKeys(page.shortcut))
          : undefined
      }
      className="focus-visible:ring-2 focus-visible:ring-ring/30 data-[disabled=true]:pointer-events-auto"
      disabled={disabled}
      onSelect={() => onNavigate({ to: page.to })}
      onKeyDown={(event) => {
        if (disabled && event.key === "Enter") {
          event.preventDefault()
        }
      }}
      // Disabled options skip arrow-key selection; Tab still exposes the explanation.
      tabIndex={disabled ? 0 : undefined}
      value={`page:${page.to}`}
    >
      <page.icon />
      <span className="font-medium">
        <Matches text={page.label} query={query} />
      </span>
      <CommandShortcut className="tracking-normal">
        {page.shortcut && shortcutLabel(pageKeys(page.shortcut))}
      </CommandShortcut>
    </CommandItem>
  )
  return page.disabledReason ? (
    <Tooltip>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent>{page.disabledReason}</TooltipContent>
    </Tooltip>
  ) : (
    item
  )
}
