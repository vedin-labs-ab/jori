import { PanelLeft } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { useSidebar } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { shortcutAria, shortcutLabel } from "@/shared/shortcuts/keys"

/** The sidebar's own shortcut, as `components/ui/sidebar` binds it. */
const sidebarKeys = { key: "b", mod: true } as const

/** Folds the sidebar from inside it, at the end of its header. The rail has
 *  no room for it: there, `SidebarRailExpand` takes over. */
export function SidebarToggle() {
  return (
    <ToggleButton
      className="size-8 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
      label="Close sidebar"
    />
  )
}

/** The organization at the sidebar's head. In the rail its square is all
 *  the header has, so it doubles as the way back: hovering or focusing it
 *  turns it into the button that opens the sidebar, and its own menu waits
 *  until there is room to show it beside everything else. */
export function SidebarRailExpand({ children }: { children: ReactNode }) {
  const { isMobile, state } = useSidebar()
  const rail = state === "collapsed" && !isMobile

  return (
    <div className="relative min-w-0 flex-1">
      <div inert={rail}>{children}</div>
      {rail ? (
        <ToggleButton
          className="absolute inset-0 size-full bg-sidebar opacity-0 hover:bg-sidebar-accent hover:opacity-100 focus-visible:opacity-100"
          label="Open sidebar"
        />
      ) : null}
    </div>
  )
}

function ToggleButton({
  className,
  label,
}: {
  className: string
  label: string
}) {
  const { toggleSidebar } = useSidebar()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-keyshortcuts={shortcutAria(sidebarKeys)}
          aria-label={label}
          className={className}
          onClick={toggleSidebar}
          size="icon"
          variant="ghost"
        >
          <PanelLeft />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-1.5" side="right">
        {label}
        <Kbd>{shortcutLabel(sidebarKeys)}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
