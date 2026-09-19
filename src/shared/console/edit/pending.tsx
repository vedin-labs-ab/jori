import { cn } from "@/lib/utils"
import { editIcons } from "./icons"
import { type EditItem } from "./state"

/** Reserve the name editor's height while creation is pending. */
export function PendingItemName({
  item,
  sidebar = false,
}: {
  item: Pick<EditItem, "kind" | "name">
  sidebar?: boolean
}) {
  const Icon = editIcons[item.kind]
  return (
    <div
      aria-busy="true"
      role="status"
      className={cn(
        "flex min-w-0 items-center gap-2",
        sidebar ? "h-8 px-2 text-xs" : "h-6 font-medium"
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="shimmer truncate text-muted-foreground [animation-delay:-1s]">
        {item.name}
      </span>
      <span className="sr-only">Creating {item.kind}.</span>
    </div>
  )
}
