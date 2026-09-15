import { Search, SearchX, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { type SearchState } from "./types"

const notices = {
  idle: {
    icon: Search,
    title: "Search your workspace",
    description: "Find files, folders, chats, and more by name or content.",
  },
  loading: {
    icon: Spinner,
    title: "Searching…",
    description: "Looking for matching names and content.",
  },
  ready: {
    icon: SearchX,
    title: "No results",
    description: "Try a different name or phrase.",
  },
  unavailable: {
    icon: TriangleAlert,
    title: "Search is unavailable",
    description: "Try again in a moment.",
  },
}

export function SearchStatus({
  status,
  onRetry,
}: {
  status: SearchState["status"]
  onRetry: () => void
}) {
  const notice = notices[status]
  return (
    <Empty className="min-h-64 gap-3" role="status">
      <EmptyHeader>
        <EmptyMedia aria-hidden="true" variant="icon">
          <notice.icon />
        </EmptyMedia>
        <EmptyTitle>{notice.title}</EmptyTitle>
        <EmptyDescription>{notice.description}</EmptyDescription>
      </EmptyHeader>
      {status === "unavailable" ? (
        <Button onClick={onRetry} size="sm" variant="outline">
          Try again
        </Button>
      ) : null}
    </Empty>
  )
}
