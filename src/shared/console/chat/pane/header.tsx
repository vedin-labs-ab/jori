import { type ReferenceTarget } from "@contracts/replies/references"
import { ArrowUpRight, MoreHorizontal } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../../dot"
import { type MaterialBreadcrumb } from "../../materials/breadcrumb"
import { SaveIcon, type SaveState } from "../../materials/save"
import { type ReferenceView } from "../../references"
import {
  referenceDestination,
  referencePresentation,
} from "../../references/presentation"
import { ConsoleLink } from "../../shell/link"

/** Under the strip, what the active tab holds: the target's icon, its
 *  name as the way to its own page, and its kind, so the pane is never
 *  the end of the road. A view that hangs a menu off its name — a
 *  store's, a file's — gets it here, on the "…" at the header's far
 *  right, under the strip's own control. */
export function PaneHeader({
  crumb,
  reference,
  target,
}: {
  /** What the body published for the shell's breadcrumb, caught here. */
  crumb: MaterialBreadcrumb | undefined
  reference: ReferenceView | undefined
  target: ReferenceTarget
}) {
  const presentation = referencePresentation(target.kind, reference?.name ?? "")
  const Icon = presentation.icon
  const isUnavailable =
    reference === undefined || reference.unavailable === true
  const name = crumb?.name ?? reference?.name ?? presentation.label

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 border-b px-4 py-2 text-sm">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      {isUnavailable ? (
        <span className="min-w-0 truncate font-medium">{name}</span>
      ) : (
        <PageLink
          name={name}
          saving={crumb?.saveStatus === "saving"}
          target={target}
        />
      )}
      <SeparatorDot className="text-muted-foreground/60" />
      <span className="shrink-0 text-muted-foreground text-xs">
        {isUnavailable ? "No longer available" : presentation.label}
      </span>
      {crumb?.menu === undefined ? null : (
        <PaneMenu menu={crumb.menu} name={name} saveStatus={crumb.saveStatus} />
      )}
    </div>
  )
}

/** The name as the link to the target's page, resting exactly where a
 *  plain name would: the pill's room comes from padding cancelled by
 *  negative margin, so the header's gaps stay optically even and the
 *  name never moves under the pointer. The arrow that says where it goes
 *  opens beside it on hover; its box and the gap before it are both
 *  collapsed at rest, so the arrow claims no width it is not using. The
 *  button's own sizing of bare icons is why the arrow sizes itself and
 *  the box does the collapsing. */
function PageLink({
  name,
  saving,
  target,
}: {
  name: string
  saving: boolean
  target: ReferenceTarget
}) {
  return (
    <Button
      asChild
      className="group -mx-1.5 min-w-0 gap-0 px-1.5 font-medium text-foreground text-sm"
      variant="ghost"
    >
      <ConsoleLink {...referenceDestination(target)}>
        <span className={cn("truncate", saving && "shimmer")}>{name}</span>
        <span
          aria-hidden
          className="flex w-0 shrink-0 overflow-hidden opacity-0 transition-[width,margin,opacity] duration-150 group-focus-visible:ml-1 group-focus-visible:w-3.5 group-focus-visible:opacity-100 group-hover:ml-1 group-hover:w-3.5 group-hover:opacity-100"
        >
          <ArrowUpRight className="size-3.5" />
        </span>
      </ConsoleLink>
    </Button>
  )
}

/** The trigger of the menu the body published: the "…" every console
 *  row opens its actions from, at the far right where the strip has its
 *  control, with the save's own glyph in its place while a save is in
 *  motion. Its margin sets its glyph on the strip's. */
function PaneMenu({
  menu,
  name,
  saveStatus,
}: {
  menu: ReactNode
  name: string
  saveStatus: SaveState | undefined
}) {
  const isIdle = saveStatus === undefined || saveStatus === "idle"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${name} menu`}
          className="-mr-2 ml-auto text-muted-foreground"
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {isIdle ? (
            <MoreHorizontal aria-hidden />
          ) : (
            <span aria-hidden className="flex">
              <SaveIcon saveStatus={saveStatus ?? "idle"} />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      {menu}
    </DropdownMenu>
  )
}
