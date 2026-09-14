import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { createRoot } from "react-dom/client"
import { DemoConsole } from "@/landing/demo/console"
import { DemoDragProvider } from "@/landing/demo/drag"
import { useDemoNavigation } from "@/landing/demo/navigation"
import { DemoWorkspaceProvider } from "@/landing/demo/provider"
import { DemoSidebar } from "@/landing/demo/sidebar"
import { ConsoleFrame } from "@/shared/console/shell/frame"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { useClipboardResponse } from "./clipboard"
import { FileStates } from "./files"
import { ChatStates } from "./thread"
import "@/styles.css"

export function StatePage() {
  const params = new URLSearchParams(location.search)
  const state = params.get("case") ?? "send-resolve"
  useClipboardResponse(state)
  const route =
    params.get("path") ??
    (state.startsWith("file-")
      ? "/files/files_notes"
      : "/chat/conversations_renewals")
  const navigation = useDemoNavigation(route)
  return (
    <DemoWorkspaceProvider now={Date.now()}>
      {state === "current-clock" || state.startsWith("copy-") ? (
        <DemoConsole
          className="h-dvh rounded-none border-0 shadow-none"
          navigation={navigation}
        />
      ) : (
        <ConsoleNavigationContext.Provider value={navigation.navigation}>
          <DemoDragProvider>
            <ConsoleFrame
              pathname={route}
              sidebar={<DemoSidebar pathname={route} />}
            >
              {state.startsWith("file-") ? (
                <FileStates state={state} />
              ) : (
                <ChatStates state={state} />
              )}
            </ConsoleFrame>
          </DemoDragProvider>
        </ConsoleNavigationContext.Provider>
      )}
    </DemoWorkspaceProvider>
  )
}
const root = document.getElementById("root")
if (!root) {
  throw new Error("Missing chat state root")
}
const router = createRouter({
  history: createMemoryHistory({ initialEntries: ["/"] }),
  routeTree: createRootRoute({ component: StatePage }),
})
createRoot(root).render(<RouterProvider router={router} />)
