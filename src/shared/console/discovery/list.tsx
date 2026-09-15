import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import { referencePresentation } from "../references/presentation"
import { conversationDestination } from "../shell/routes"
import { Result } from "./item"
import { PageResult } from "./page"
import { matchingPages } from "./results"
import { SearchStatus } from "./status"
import { type PaletteProps } from "./types"

export function Results(props: PaletteProps) {
  const pages = matchingPages(props.query, props.pages)
  const recent = !props.query.trim() && props.chats.length > 0
  const { hits, status } = props.state
  const showStatus =
    status === "loading" ||
    status === "unavailable" ||
    (!hits.length && !pages.length && !recent)
  return (
    <>
      {recent ? <Recent {...props} /> : null}
      {pages.length ? (
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <PageResult
              key={page.to}
              page={page}
              query={props.query}
              onNavigate={props.onNavigate}
            />
          ))}
        </CommandGroup>
      ) : null}
      {pages.length && hits.length ? <CommandSeparator /> : null}
      {hits.length || (showStatus && props.query.trim()) ? (
        <CommandGroup
          className="flex flex-1 flex-col [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-1 [&_[cmdk-group-items]]:flex-col"
          heading="Results"
        >
          {hits.map((hit, index) => (
            <Result
              hit={hit}
              query={props.query}
              index={index}
              key={`${hit.candidate.key}:${hit.candidate.part}`}
              onOpen={props.onOpenHit}
            />
          ))}
          {showStatus ? (
            <SearchStatus onRetry={props.onRetry} status={status} />
          ) : null}
        </CommandGroup>
      ) : null}
      {showStatus && !props.query.trim() ? (
        <SearchStatus onRetry={props.onRetry} status={status} />
      ) : null}
    </>
  )
}

function Recent(props: PaletteProps) {
  const { icon: ChatIcon } = referencePresentation("chat", "")
  return (
    <CommandGroup heading="Recent">
      {props.chats.slice(0, 5).map((chat) => (
        <CommandItem
          key={chat.id}
          onSelect={() => props.onNavigate(conversationDestination(chat.id))}
          value={`chat:${chat.id}`}
        >
          <ChatIcon />
          <span className="truncate">{chat.title}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
