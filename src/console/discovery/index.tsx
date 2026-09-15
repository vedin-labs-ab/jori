import { type ReactNode, useCallback, useContext, useState } from "react"
import { type ChatConversation } from "@/shared/console/chat/types"
import { pageBindings, searchKeys } from "@/shared/console/discovery/bindings"
import { ShortcutGuide } from "@/shared/console/discovery/guide"
import { SearchPalette } from "@/shared/console/discovery/palette"
import { SearchTrigger } from "@/shared/console/discovery/trigger"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { useActiveOrganization } from "@/shared/session/auth"
import { useShortcuts } from "@/shared/shortcuts"
import { SearchContext } from "./context"
import { useOpenHit } from "./open"
import { useSearch } from "./query"

export function SidebarSearch() {
  const changeOpen = useContext(SearchContext)
  return <SearchTrigger onClick={() => changeOpen?.(true)} />
}

export function ConsoleSearch({
  chats,
  children,
}: {
  chats: ChatConversation[]
  children: ReactNode
}) {
  const active = useActiveOrganization().data
  return (
    <WorkspaceSearch
      chats={chats}
      key={active?.id}
      organizationId={active?.id}
      organizationName={active?.name}
    >
      {children}
    </WorkspaceSearch>
  )
}

function WorkspaceSearch({
  chats,
  children,
  organizationId,
  organizationName,
}: {
  chats: ChatConversation[]
  children: ReactNode
  organizationId?: string
  organizationName?: string
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [retry, setRetry] = useState(0)
  const state = useSearch(organizationId, open ? text : "", retry)
  const navigate = useConsoleNavigate()
  const changeOpen = useCallback((value: boolean) => {
    setOpen(value)
    if (!value) {
      setText("")
    }
  }, [])
  useShortcuts([
    { shortcut: searchKeys, allowInInput: true, run: () => changeOpen(true) },
    ...pageBindings(navigate),
  ])
  const openHit = useOpenHit(organizationId, text, open, () =>
    changeOpen(false)
  )

  return (
    <SearchContext value={changeOpen}>
      {children}
      <ShortcutGuide />
      <SearchPalette
        chats={chats}
        onOpenChange={changeOpen}
        onOpenHit={(hit) => void openHit(hit)}
        onNavigate={(destination) => {
          changeOpen(false)
          navigate(destination)
        }}
        onRetry={() => setRetry((value) => value + 1)}
        onQueryChange={setText}
        open={open}
        organizationName={organizationName}
        query={text}
        state={state}
      />
    </SearchContext>
  )
}
