import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ConsoleHeaderActions } from "@/shared/console/layout"
import { ConsoleFrame } from "@/shared/console/shell/frame"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { NearViewport } from "../viewport"
import { DemoVisibilityDirectory } from "./directory"
import { DemoSearch } from "./discovery"
import { DemoDragProvider } from "./drag"
import { DemoEditing } from "./edit"
import { type DemoNavigation } from "./navigation"
import { DemoPage } from "./pages/router"
import { DemoSidebar } from "./sidebar"

/** The box a mock console sits in. The frame fills it instead of the
 *  viewport, and the transform makes the container what the sidebar's
 *  fixed positioning is measured against, so the sidebar, the header,
 *  and the inset all stay inside; the sidebar's own viewport
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
  lazy = false,
  ...props
}: DemoConsoleProps & {
  /** For a console down the page: a whole console is a lot to render and
   *  hydrate, so it waits, as an empty box of its own size, until the
   *  reader is within a screen of it. */
  lazy?: boolean
}) {
  return lazy ? (
    <NearViewport
      fallback={
        <div
          className={cn(frameClassName, props.className)}
          id={props.navigation.navigation.anchor}
        />
      }
    >
      <MountedConsole {...props} />
    </NearViewport>
  ) : (
    <MountedConsole {...props} />
  )
}

type DemoConsoleProps = {
  /** The box's size; the frame fills whatever it is given. */
  className?: string
  /** Where the console is and how it moves, from `useDemoNavigation`. */
  navigation: DemoNavigation
  /** The run the Activity page shows open from the start. */
  openRunId?: string
  /** Left out, the header opens on the title and the pages fill the box. */
  sidebar?: boolean
}

function MountedConsole({
  className,
  navigation: { location, navigation },
  openRunId,
  sidebar = true,
}: DemoConsoleProps) {
  const scope = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <ConsoleNavigationContext.Provider value={navigation}>
      <DemoSearch scope={scope}>
        {(search) => (
          <div
            className={cn(frameClassName, className)}
            id={navigation.anchor}
            ref={scope}
          >
            <DemoVisibilityDirectory>
              <DemoEditing>
                <DemoDragProvider>
                  <ConsoleFrame
                    className="h-full min-h-0"
                    heading="h3"
                    onSidebarOpenChange={setSidebarOpen}
                    pathname={location.pathname}
                    sidebar={
                      sidebar ? (
                        <DemoSidebar
                          pathname={location.pathname}
                          search={search}
                        />
                      ) : undefined
                    }
                    sidebarOpen={sidebarOpen}
                  >
                    {/* Search lives in the sidebar; the header carries it
                        only where the sidebar has folded away. A mock
                        without a sidebar is a single page to look at, so
                        the palette stays behind its shortcut there. */}
                    {sidebar ? (
                      <ConsoleHeaderActions>
                        <span className="md:hidden">{search}</span>
                      </ConsoleHeaderActions>
                    ) : null}
                    <DemoPage location={location} openRunId={openRunId} />
                  </ConsoleFrame>
                </DemoDragProvider>
              </DemoEditing>
            </DemoVisibilityDirectory>
          </div>
        )}
      </DemoSearch>
    </ConsoleNavigationContext.Provider>
  )
}
