import { type Hit } from "@contracts/discovery"
import { type ChatConversation } from "../chat/types"
import { type ConsoleDestination } from "../shell/location"
import { type ConsoleSurface } from "../shell/routes"

export type SearchState = {
  status: "idle" | "loading" | "ready" | "unavailable"
  hits: Hit[]
  partial: boolean
}
export type PaletteProps = {
  pages?: readonly ConsoleSurface[]
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
