import { Folder, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { resourcePresentation } from "../types"
import { type DragPayload, payloadSize } from "./plan"

// The pointer-tracking ghost: a compact card with the row's idiom, lifted
// by a shadow and, when motion is welcome, a slight scale-up. A drag
// carrying more than one row shows the first row's card in front, counts
// the rest after its name, and fans up to two more cards out behind it,
// each turned a little further about the front card's left edge, so the
// pile reads as several things held in one hand.

/** How many cards may show behind the front one. */
const pileDepth = 2

/** The decorative cards' place behind the front, per layer: how far each
 *  turns about the front card's left edge, lifting its right end, and how
 *  much it fades. Nothing here animates, so the turn holds under reduced
 *  motion — it is what makes the cards behind visible at all. */
const pileLayers = ["-rotate-3 opacity-85", "-rotate-6 opacity-70"]

type GhostItem = { key: string; name: string; icon: LucideIcon }

export function DragGhost({ payload }: { payload: DragPayload }) {
  const [front, ...rest] = ghostItems(payload)
  const behind = rest.slice(0, pileDepth)
  const others = payloadSize(payload) - 1

  return (
    <div className="relative motion-safe:scale-105">
      {behind.map((item, index) => (
        <GhostCard
          aria-hidden
          className={cn(
            "absolute inset-0 w-full origin-left",
            pileLayers[index]
          )}
          data-ghost="behind"
          item={item}
          key={item.key}
        />
      ))}
      <GhostCard className="relative" item={front}>
        {others > 0 ? (
          <span className="shrink-0 text-muted-foreground">+{others}</span>
        ) : null}
      </GhostCard>
    </div>
  )
}

function GhostCard({
  children,
  className,
  item,
  ...props
}: {
  "aria-hidden"?: boolean
  "data-ghost"?: "behind"
  children?: React.ReactNode
  className?: string
  item: GhostItem
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-fit max-w-64 items-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-2 text-sidebar-foreground text-xs shadow-md",
        className
      )}
      {...props}
    >
      <item.icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{item.name}</span>
      {children}
    </div>
  )
}

/** What the pile shows, folders first: each row's idiom and name. */
function ghostItems(payload: DragPayload): [GhostItem, ...GhostItem[]] {
  const items: GhostItem[] = [
    ...payload.folders.map((folder) => ({
      key: `folder:${folder.folderId}`,
      name: folder.name,
      icon: Folder,
    })),
    ...payload.resources.map((resource) => ({
      key: `${resource.type}:${resource.id}`,
      name: resource.name,
      icon: resourcePresentation(resource).icon,
    })),
  ]
  const [front, ...rest] = items

  return [front ?? { key: "none", name: "", icon: Folder }, ...rest]
}
