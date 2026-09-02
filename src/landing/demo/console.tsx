import { useState } from "react"
import { cn } from "@/lib/utils"
import { ConsoleFrame } from "@/shared/console/shell/frame"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { DemoDragProvider } from "./drag"
import { type DemoNavigation } from "./navigation"
import { DemoPage } from "./pages/router"
import { DemoSidebar } from "./sidebar"

/** The box a mock console sits in. The frame fills it instead of the
 *  viewport, and the transform makes the container what the sidebar's
 *  fixed positioning is measured against, so the sidebar, its rail, the
 *  header, and the inset all stay inside; the sidebar's own viewport
 *  heights are overridden through its slots for the same reason. On a
 *  narrow viewport the sidebar and the filter panel would open as sheets
 *  over the whole page, so their triggers are left out there. */
const frameClassName = cn(
  "relative overflow-hidden rounded-xl border bg-background text-left text-foreground shadow-sm [transform:translateZ(0)]",
  "[&_[data-slot=sidebar-container]]:h-full",
  "max-md:[&_[data-slot=sidebar-trigger]]:hidden max-md:[&_[data-slot=sidebar-trigger]+[data-slot=separator]]:hidden",
  "max-md:[&_[data-slot=filters-trigger]]:hidden"
)

/** The console over the workspace: the same frame, sidebar, and pages the
 *  console renders, under the navigation its host holds, so every link
 *  inside moves this box and nothing else. */
export function DemoConsole({
  className,
  navigation: { location, navigation },
  openRunId,
  sidebar = true,
}: {
  /** The box's size; the frame fills whatever it is given. */
  className?: string
  /** Where the console is and how it moves, from `useDemoNavigation`. */
  navigation: DemoNavigation
  /** The run the Activity page shows open from the start. */
  openRunId?: string
  /** Left out, the header opens on the title and the pages fill the box. */
  sidebar?: boolean
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <ConsoleNavigationContext.Provider value={navigation}>
      <div className={cn(frameClassName, className)}>
        <DemoDragProvider>
          <ConsoleFrame
            className="h-full min-h-0"
            onSidebarOpenChange={setSidebarOpen}
            pathname={location.pathname}
            sidebar={
              sidebar ? <DemoSidebar pathname={location.pathname} /> : undefined
            }
            sidebarOpen={sidebarOpen}
          >
            <DemoPage location={location} openRunId={openRunId} />
          </ConsoleFrame>
        </DemoDragProvider>
      </div>
    </ConsoleNavigationContext.Provider>
  )
}
