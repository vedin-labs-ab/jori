import { PanelLeft } from "lucide-react"
import { type ReactNode } from "react"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ShortcutButton } from "@/shared/shortcuts/button"

/** The sidebar's own shortcut, as `components/ui/sidebar` binds it. */
const sidebarKeys = { key: "b", mod: true } as const

/** Folds the sidebar from inside it, at the end of its header. The rail has
 *  no room for it: there, `SidebarRailExpand` takes over. It ends a row, so
 *  its tooltip opens below it like the rest of the row's. */
export function SidebarToggle() {
  const { toggleSidebar } = useSidebar()

  return (
    <ShortcutButton
      className="size-8 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
      keys={sidebarKeys}
      label="Close sidebar"
      onClick={toggleSidebar}
      side="bottom"
    >
      <PanelLeft />
    </ShortcutButton>
  )
}

/** The organization at the sidebar's head. In the rail its square is all
 *  the header has, so it doubles as the way back: hovering or focusing it
 *  turns it into the button that opens the sidebar, and its own menu waits
 *  until there is room to show it beside everything else.
 *
 *  The swap is one state for both halves, and nothing in it eases. The
 *  square steps aside for the button instead of sitting under it, since a
 *  ghost button's hover is translucent; were one to fade while the other
 *  cut, the square would stand empty in between.
 *
 *  In the rail the swap belongs to the square alone. The row around it
 *  takes a moment to fold, and a wider target would pass under a pointer
 *  still resting where the sidebar was closed from. */
export function SidebarRailExpand({ children }: { children: ReactNode }) {
  const { isMobile, state, toggleSidebar } = useSidebar()
  const rail = state === "collapsed" && !isMobile

  return (
    <div
      className={cn(
        "group/expand relative min-w-0",
        rail ? "size-8 flex-none" : "flex-1"
      )}
    >
      <div
        className={cn(
          rail &&
            "group-focus-within/expand:opacity-0 group-hover/expand:opacity-0"
        )}
        inert={rail}
      >
        {children}
      </div>
      {rail ? (
        <ShortcutButton
          className="absolute inset-0 size-full opacity-0 transition-none group-focus-within/expand:opacity-100 group-hover/expand:opacity-100"
          keys={sidebarKeys}
          label="Open sidebar"
          onClick={toggleSidebar}
          side="right"
        >
          <PanelLeft />
        </ShortcutButton>
      ) : null}
    </div>
  )
}
