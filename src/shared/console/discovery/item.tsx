import { type Hit } from "@contracts/discovery"
import { CommandItem, CommandShortcut } from "@/components/ui/command"
import { shortcutAria, shortcutLabel } from "@/shared/shortcuts/keys"
import { referencePresentation } from "../references/presentation"
import { resultKeys } from "./bindings"

export function Result({
  hit,
  index,
  onOpen,
}: {
  hit: Hit
  index: number
  onOpen: (hit: Hit) => void
}) {
  const { icon: Icon } = referencePresentation(hit.kind, hit.resourceName)
  const parent = hit.title !== hit.resourceName ? hit.resourceName : undefined
  const detail = resultDetail(hit)
  const shortcut = index < 5 ? resultKeys(index) : undefined
  return (
    <CommandItem
      aria-keyshortcuts={shortcut && shortcutAria(shortcut)}
      onSelect={() => onOpen(hit)}
      value={`${hit.candidate.key}:${hit.candidate.part}`}
    >
      <Icon />
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className="flex min-w-0 items-baseline gap-1.5"
          title={[hit.title, parent].filter(Boolean).join(" · ")}
        >
          <span className="truncate">{hit.title || "Untitled"}</span>
          {parent ? (
            <span className="min-w-0 max-w-[45%] truncate text-muted-foreground">
              · {parent}
            </span>
          ) : null}
        </span>
        {detail ? (
          <span className="truncate text-muted-foreground" title={detail}>
            {detail}
          </span>
        ) : null}
      </span>
      <CommandShortcut className="shrink-0 tracking-normal">
        {shortcut ? shortcutLabel(shortcut) : null}
      </CommandShortcut>
    </CommandItem>
  )
}

function resultDetail(hit: Hit) {
  const location = ["File content", "Store value", "Run activity"].includes(
    hit.location.label ?? ""
  )
    ? undefined
    : hit.location.label
  const snippet = [hit.title, hit.resourceName, location].includes(hit.snippet)
    ? undefined
    : hit.snippet
  return [
    hit.coverage ? coverageLabels[hit.coverage] : undefined,
    location !== hit.title && location !== hit.resourceName
      ? location
      : undefined,
    snippet,
  ]
    .filter(Boolean)
    .join(" · ")
}

const coverageLabels: Record<string, string> = {
  partial: "Partial text",
  unsupported: "Name only",
  too_large: "Name only",
  failed: "Text unavailable",
  empty: "No searchable text",
}
