import { useRouterState } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { ConsoleFrame } from "@/shared/console/shell/frame"
import { ConsoleSidebar } from "@/shared/console/shell/navigation"
import { mainContentId, SkipToContent } from "@/shared/skip"
import { useSidebarChats } from "../chat/recent"
import { ConsoleFolderDrag } from "../folders/drag/context"
import { SidebarFolders } from "../folders/section"
import { SidebarUserButton } from "./account"
import { ConsolePageBoundary } from "./boundary"
import { SidebarOrganizationSwitcher } from "./organization"

/** The console around a page: the shared frame and sidebar, bound to the
 *  router for where the console is and to the session for who is in it. */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const { pathname, loadedAt } = useRouterState({
    select: (state) => ({
      pathname: state.matches.at(-1)?.pathname ?? state.location.pathname,
      loadedAt: state.loadedAt,
    }),
  })
  const chats = useSidebarChats()

  return (
    // One drag context above both panes, so folder-page rows can drop
    // onto the sidebar tree and vice versa. Renders no DOM of its own.
    <ConsoleFolderDrag>
      <SkipToContent />
      <ConsoleFrame
        contentId={mainContentId}
        filterStorageKey="console.filters"
        pathname={pathname}
        sidebar={
          <ConsoleSidebar
            account={<SidebarUserButton />}
            chats={chats}
            folders={<SidebarFolders pathname={pathname} />}
            organization={<SidebarOrganizationSwitcher />}
            pathname={pathname}
          />
        }
      >
        {/* Below the chrome, so a page that throws leaves the sidebar and
            header standing to navigate away with. */}
        <ConsolePageBoundary resetKey={`${pathname}:${loadedAt}`}>
          {children}
        </ConsolePageBoundary>
      </ConsoleFrame>
    </ConsoleFolderDrag>
  )
}
