import { type Hit } from "@contracts/discovery"
import { useConvex } from "convex/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { type ChatConversation } from "@/shared/console/chat/types"
import { SearchPalette } from "@/shared/console/discovery/palette"
import { hitDestination } from "@/shared/console/discovery/results"
import { useSearchShortcut } from "@/shared/console/discovery/shortcut"
import { SearchTrigger } from "@/shared/console/discovery/trigger"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { useActiveOrganization } from "@/shared/session/auth"
import { api } from "../../../convex/_generated/api"
import { useSearch } from "./query"

export function SidebarSearch({ chats }: { chats: ChatConversation[] }) {
  const active = useActiveOrganization().data
  return (
    <WorkspaceSearch
      chats={chats}
      key={active?.id}
      organizationId={active?.id}
      organizationName={active?.name}
    />
  )
}

function WorkspaceSearch({
  chats,
  organizationId,
  organizationName,
}: {
  chats: ChatConversation[]
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
  useSearchShortcut(
    useCallback(() => {
      setOpen((value) => !value)
      setText("")
    }, [])
  )
  const openHit = useOpenHit(organizationId, text, () => changeOpen(false))

  return (
    <>
      <SearchTrigger onClick={() => changeOpen(true)} />
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
    </>
  )
}

function useOpenHit(
  organizationId: string | undefined,
  text: string,
  onClose: () => void
) {
  const navigate = useConsoleNavigate()
  const convex = useConvex()
  const session = useRef(0)
  useEffect(
    () => () => {
      session.current++
    },
    []
  )
  return async (hit: Hit) => {
    if (!organizationId) {
      return
    }
    const token = session.current
    try {
      const current = await convex.query(api.discovery.console.visible, {
        organizationId,
        text,
        candidates: [hit.candidate],
      })
      if (token !== session.current) {
        return
      }
      if (!current.length) {
        toast.error("This result is no longer available.")
        return
      }
      onClose()
      navigate(hitDestination(current[0]))
    } catch {
      toast.error("Could not open this result. Try again.")
    }
  }
}
