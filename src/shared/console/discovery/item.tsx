import { type Hit } from "@contracts/discovery"
import { CommandItem, CommandShortcut } from "@/components/ui/command"
import { shortcutAria, shortcutLabel } from "@/shared/shortcuts/keys"
import { referencePresentation } from "../references/presentation"
import { resultKeys } from "./bindings"
import { resultDetail } from "./detail"
import { Matches } from "./matches"

export function Result({
  hit,
  index,
  query,
  onOpen,
}: {
  hit: Hit
  index: number
  query: string
  onOpen: (hit: Hit) => void
}) {
  const { icon: Icon } = referencePresentation(hit.kind, hit.resourceName)
  const detail = resultDetail(hit, query)
  const shortcut = index < 5 ? resultKeys(index) : undefined
  return (
    <CommandItem
      aria-keyshortcuts={shortcut && shortcutAria(shortcut)}
      onSelect={() => onOpen(hit)}
      value={`${hit.candidate.key}:${hit.candidate.part}`}
    >
      <Icon />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate" title={hit.title}>
          <Matches text={hit.title || "Untitled"} query={query} />
        </span>
        {detail ? (
          <span className="truncate text-muted-foreground" title={detail}>
            <Matches text={detail} query={query} />
          </span>
        ) : null}
      </span>
      <CommandShortcut className="shrink-0 tracking-normal">
        {shortcut ? shortcutLabel(shortcut) : null}
      </CommandShortcut>
    </CommandItem>
  )
}
