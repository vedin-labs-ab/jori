import { type ReferenceKind } from "@contracts/replies/parts"
import { ArrowLeft, Plus } from "lucide-react"
import { useState } from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { InputGroupButton } from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  type MentionResource,
  type MentionSources,
  type MentionSuggestion,
  resourceSuggestion,
} from "../../mentions/sources"
import { referencePresentation } from "../presentation"

/** The kinds the menu lists, in the order they are reached for. */
const attachKinds: readonly ReferenceKind[] = [
  "chat",
  "table",
  "file",
  "store",
  "job",
  "folder",
  "run",
]

/** The "+" beside the hints: a menu of everything a message can mention,
 *  a search at its top and a kind per row under it, each opening to its
 *  items. Typing searches across every kind at once. Choosing puts the
 *  chip at the caret. */
export function AttachMenu({
  onPick,
  sources,
}: {
  onPick: (suggestion: MentionSuggestion) => void
  sources: MentionSources
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState<ReferenceKind | null>(null)
  const pick = (resource: MentionResource) => {
    onPick(resourceSuggestion(resource))
    setOpen(false)
  }

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next)
        setQuery("")
        setKind(null)
        // The host narrowed its lists to whatever was last looked for
        // under `+`; the menu opens on everything.
        sources.onSearch?.("")
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <InputGroupButton
          aria-label="Attach a resource"
          className="text-muted-foreground"
          size="icon-sm"
          variant="ghost"
        >
          <Plus aria-hidden="true" />
        </InputGroupButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            onValueChange={(next) => {
              setQuery(next)
              sources.onSearch?.(next)
            }}
            placeholder="Search resources"
            value={query}
          />
          <CommandList>
            {query !== "" ? (
              <SearchResults
                onPick={pick}
                query={query}
                resources={sources.resources}
              />
            ) : kind === null ? (
              <KindRows onChoose={setKind} resources={sources.resources} />
            ) : (
              <KindItems
                kind={kind}
                onBack={() => setKind(null)}
                onPick={pick}
                resources={sources.resources}
              />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** The menu's first page: a row per kind, with how many it holds. */
function KindRows({
  onChoose,
  resources,
}: {
  onChoose: (kind: ReferenceKind) => void
  resources: readonly MentionResource[]
}) {
  return (
    <CommandGroup>
      {attachKinds.map((kind) => {
        const { icon: Icon } = referencePresentation(kind, "")
        const count = resources.filter((item) => item.kind === kind).length

        return (
          <CommandItem
            key={kind}
            onSelect={() => onChoose(kind)}
            value={`kind:${kind}`}
          >
            <Icon aria-hidden="true" className="text-muted-foreground" />
            {pluralLabel(kind)}
            <CommandShortcut className="text-xs tabular-nums tracking-normal">
              {count}
            </CommandShortcut>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

/** One kind's items, with the way back to the kinds above them. */
function KindItems({
  kind,
  onBack,
  onPick,
  resources,
}: {
  kind: ReferenceKind
  onBack: () => void
  onPick: (resource: MentionResource) => void
  resources: readonly MentionResource[]
}) {
  const items = resources.filter((item) => item.kind === kind)

  return (
    <>
      <CommandGroup>
        <CommandItem onSelect={onBack} value="back">
          <ArrowLeft aria-hidden="true" className="text-muted-foreground" />
          All resources
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading={pluralLabel(kind)}>
        {items.map((item) => (
          <ResourceItem key={item.id} onPick={onPick} resource={item} />
        ))}
      </CommandGroup>
      {items.length === 0 ? (
        <CommandEmpty>No {pluralLabel(kind).toLowerCase()} yet.</CommandEmpty>
      ) : null}
    </>
  )
}

/** What the search finds, grouped by kind; kinds with nothing stay out. */
function SearchResults({
  onPick,
  query,
  resources,
}: {
  onPick: (resource: MentionResource) => void
  query: string
  resources: readonly MentionResource[]
}) {
  const needle = query.trim().toLowerCase()
  const groups = attachKinds
    .map((kind) => ({
      items: resources.filter(
        (item) => item.kind === kind && item.name.toLowerCase().includes(needle)
      ),
      kind,
    }))
    .filter((group) => group.items.length > 0)

  if (groups.length === 0) {
    return <CommandEmpty>Nothing matches.</CommandEmpty>
  }

  return groups.map((group) => (
    <CommandGroup heading={pluralLabel(group.kind)} key={group.kind}>
      {group.items.map((item) => (
        <ResourceItem key={item.id} onPick={onPick} resource={item} />
      ))}
    </CommandGroup>
  ))
}

function ResourceItem({
  onPick,
  resource,
}: {
  onPick: (resource: MentionResource) => void
  resource: MentionResource
}) {
  const { icon: Icon } = referencePresentation(resource.kind, resource.name)

  return (
    <CommandItem
      onSelect={() => onPick(resource)}
      value={`${resource.kind}:${resource.id}`}
    >
      <Icon aria-hidden="true" className="text-muted-foreground" />
      <span className="min-w-0 truncate">{resource.name}</span>
    </CommandItem>
  )
}

function pluralLabel(kind: ReferenceKind) {
  return `${referencePresentation(kind, "").label}s`
}
