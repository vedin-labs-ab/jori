import { MessageSquare } from "lucide-react"
import {
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { shortcutAria, shortcutLabel } from "@/shared/shortcuts/keys"
import { conversationDestination } from "../shell/routes"
import { pageKeys } from "./bindings"
import { Result } from "./item"
import { matchingPages } from "./results"
import { SearchStatus } from "./status"
import { type PaletteProps } from "./types"

export function Results(props: PaletteProps) {
  const pages = matchingPages(props.query)
  const recent = !props.query.trim() && props.chats.length > 0
  const { hits, status } = props.state
  const showStatus =
    status === "loading" ||
    status === "unavailable" ||
    (!hits.length && !pages.length && !recent)
  return (
    <CommandList className="h-80 max-h-[50dvh]">
      {recent ? <Recent {...props} /> : null}
      {pages.length ? (
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              aria-keyshortcuts={
                page.shortcut && shortcutAria(pageKeys(page.shortcut))
              }
              key={page.to}
              onSelect={() => props.onNavigate({ to: page.to })}
              value={`page:${page.to}`}
            >
              <page.icon />
              <span>{page.label}</span>
              <CommandShortcut className="tracking-normal">
                {page.shortcut && shortcutLabel(pageKeys(page.shortcut))}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {pages.length && hits.length ? <CommandSeparator /> : null}
      {hits.length ? (
        <CommandGroup heading="Results">
          {hits.map((hit, index) => (
            <Result
              hit={hit}
              index={index}
              key={`${hit.candidate.key}:${hit.candidate.part}`}
              onOpen={props.onOpenHit}
            />
          ))}
        </CommandGroup>
      ) : null}
      {showStatus ? (
        <SearchStatus onRetry={props.onRetry} status={status} />
      ) : null}
    </CommandList>
  )
}

function Recent(props: PaletteProps) {
  return (
    <CommandGroup heading="Recent">
      {props.chats.slice(0, 5).map((chat) => (
        <CommandItem
          key={chat.id}
          onSelect={() => props.onNavigate(conversationDestination(chat.id))}
          value={`chat:${chat.id}`}
        >
          <MessageSquare />
          <span className="truncate">{chat.title}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
