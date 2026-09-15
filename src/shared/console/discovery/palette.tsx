import { type Hit } from "@contracts/discovery"
import { MessageSquare, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { type ChatConversation } from "../chat/types"
import { referencePresentation } from "../references/presentation"
import { type ConsoleDestination } from "../shell/location"
import { conversationDestination } from "../shell/routes"
import { matchingPages } from "./results"

export type SearchState = {
  status: "idle" | "loading" | "ready" | "unavailable"
  hits: Hit[]
  partial: boolean
}
type Props = {
  chats: ChatConversation[]
  open: boolean
  query: string
  organizationName?: string
  state: SearchState
  onQueryChange: (text: string) => void
  onOpenChange: (open: boolean) => void
  onOpenHit: (hit: Hit) => void
  onNavigate: (destination: ConsoleDestination) => void
  onRetry: () => void
}

export function SearchPalette(props: Props) {
  const scope = props.organizationName
    ? ` ${props.organizationName}`
    : " workspace"
  return (
    <CommandDialog
      className="sm:max-w-lg"
      description="Find resources by name or content. Arrow keys choose, Enter opens, Escape closes."
      onOpenChange={props.onOpenChange}
      open={props.open}
      title={`Search${scope}`}
    >
      <Command shouldFilter={false}>
        <CommandInput
          aria-busy={props.state.status === "loading"}
          aria-label={`Search${scope}`}
          onValueChange={props.onQueryChange}
          placeholder={`Search${scope}…`}
          value={props.query}
        />
        <Results {...props} />
        <div className="-mx-1 -mb-1 mt-1 flex min-h-9 items-center gap-3 border-t px-3 text-[0.625rem] text-muted-foreground">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> choose
          </span>
          <span>
            <Kbd>↵</Kbd> open
          </span>
          <span>
            <Kbd>esc</Kbd> close
          </span>
          <span aria-live="polite" className="ml-auto truncate">
            {props.state.partial ? "Some results may be missing." : ""}
          </span>
        </div>
      </Command>
    </CommandDialog>
  )
}

function Results(props: Props) {
  const pages = matchingPages(props.query)
  const typed = props.query.trim() !== ""
  return (
    <CommandList className="max-h-96">
      {!typed && props.chats.length > 0 ? (
        <CommandGroup heading="Recent chats">
          {props.chats.slice(0, 5).map((chat) => (
            <CommandItem
              key={chat.id}
              onSelect={() =>
                props.onNavigate(conversationDestination(chat.id))
              }
              value={`chat:${chat.id}`}
            >
              <MessageSquare />
              <span className="truncate">{chat.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {!typed && !props.chats.length ? (
        <Notice>
          Find chats, jobs, files, folders, tables, stores, and activity.
        </Notice>
      ) : null}
      {pages.length || props.state.hits.length ? (
        <CommandGroup>
          {pages.map((page) => (
            <CommandItem
              key={page.to}
              onSelect={() => props.onNavigate({ to: page.to })}
              value={`page:${page.to}`}
            >
              <page.icon />
              <span>{page.label}</span>
            </CommandItem>
          ))}
          {props.state.hits.map((hit) => (
            <Result
              hit={hit}
              key={`${hit.candidate.key}:${hit.candidate.part}`}
              onOpen={props.onOpenHit}
            />
          ))}
        </CommandGroup>
      ) : null}
      {props.state.status === "loading" ? (
        <Notice>
          <Spinner className="size-3" />
          Searching…
        </Notice>
      ) : null}
      {typed &&
      props.state.status === "ready" &&
      !pages.length &&
      !props.state.hits.length ? (
        <Notice>
          <SearchX className="size-4" />
          No matches. Try another word or phrase.
        </Notice>
      ) : null}
      {props.state.status === "unavailable" ? (
        <Notice>
          Search is unavailable.
          <Button onClick={props.onRetry} size="sm" variant="ghost">
            Try again
          </Button>
        </Notice>
      ) : null}
    </CommandList>
  )
}

function Result({ hit, onOpen }: { hit: Hit; onOpen: (hit: Hit) => void }) {
  const { icon: Icon } = referencePresentation(hit.kind, hit.resourceName)
  const detail =
    hit.title !== hit.resourceName ? hit.resourceName : hit.location.label
  return (
    <CommandItem
      className="items-start"
      onSelect={() => onOpen(hit)}
      value={`${hit.candidate.key}:${hit.candidate.part}`}
    >
      <Icon className="mt-0.5" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{hit.title || "Untitled"}</span>
        {detail ? (
          <span className="truncate text-muted-foreground">{detail}</span>
        ) : null}
        {hit.snippet ? (
          <span className="line-clamp-2 text-muted-foreground">
            {hit.snippet}
          </span>
        ) : null}
        {hit.coverage &&
        !["complete", "ocr", "transcript"].includes(hit.coverage) ? (
          <span className="text-muted-foreground">
            File content {hit.coverage.replaceAll("_", " ")}
          </span>
        ) : null}
      </span>
    </CommandItem>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-6 text-center text-muted-foreground text-xs"
      role="status"
    >
      {children}
    </div>
  )
}
