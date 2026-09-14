import { Slot } from "radix-ui"
import { type ComponentProps } from "react"
import { cn } from "@/lib/utils"

/** The ground a folder stands on: the card's, on a page, or the muted one
 *  where it sits inside another surface and needs to read as its own. */
type Tone = "card" | "muted"

const grounds: Record<Tone, string> = {
  card: "bg-card text-card-foreground",
  muted: "bg-muted text-foreground",
}

/**
 * A folder: tabs along the top edge and one body the open tab joins. The
 * open tab shares the body's ground and paints over its top edge, so the
 * two read as one shape; a closed tab sits a step lower and behind, the
 * way the next folder in a drawer does. Which tab is open is whichever
 * carries `data-state="active"`, so a Radix trigger can be one as easily
 * as a label that never changes.
 */
export function Folder({
  className,
  tone = "card",
  ...props
}: ComponentProps<"div"> & { tone?: Tone }) {
  return (
    <div
      className={cn("rounded-2xl border", grounds[tone], className)}
      {...props}
    />
  )
}

/** The row of tabs. `asChild` lets a tab list own the element, so the row
 *  is the list. */
export function FolderTabs({
  asChild = false,
  className,
  ...props
}: ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      className={cn(
        "relative z-10 -mb-px flex items-end gap-1.5 pl-5",
        className
      )}
      {...props}
    />
  )
}

const covers: Record<Tone, string> = {
  card: "data-[state=active]:bg-card data-[state=active]:after:bg-card",
  muted: "data-[state=active]:bg-muted data-[state=active]:after:bg-muted",
}

/**
 * The open tab hides the body's top edge under it. The tab's box overlaps
 * the body by one pixel, and a strip of the tab's own ground, four pixels
 * tall, is drawn from two pixels above that edge to one pixel below it
 * inside the body. Layout can put the edge on a fraction of a pixel (a
 * dialog is centred with a transform), which antialiases the line across
 * two device rows; the strip overdraws both, so no hairline survives.
 */
export function FolderTab({
  active = false,
  className,
  tone = "card",
  ...props
}: ComponentProps<"span"> & { active?: boolean; tone?: Tone }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-11 items-center rounded-t-xl border bg-muted px-5 font-medium text-muted-foreground text-sm transition-colors outline-none",
        "hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        "data-[state=active]:h-12 data-[state=active]:border-b-transparent data-[state=active]:text-foreground",
        "data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-0.5 data-[state=active]:after:h-1 data-[state=active]:after:content-['']",
        covers[tone],
        className
      )}
      data-state={active ? "active" : "inactive"}
      {...props}
    />
  )
}
