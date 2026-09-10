import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { createRoot } from "react-dom/client"
import { DemoConsole } from "@/landing/demo/console"
import { useDemoNavigation } from "@/landing/demo/navigation"
import { DemoWorkspaceProvider } from "@/landing/demo/provider"
import "@/styles.css"

export function MeasurementPage() {
  const path = new URLSearchParams(location.search).get("path") ?? "/folders"
  const navigation = useDemoNavigation(path)
  return (
    <DemoWorkspaceProvider now={Date.UTC(2026, 8, 9, 9, 15)}>
      <DemoConsole
        className="h-dvh rounded-none border-0 shadow-none"
        navigation={navigation}
      />
    </DemoWorkspaceProvider>
  )
}

const root = document.getElementById("root")
if (!root) {
  throw new Error("Missing layout measurement root")
}
const router = createRouter({
  history: createMemoryHistory({ initialEntries: ["/"] }),
  routeTree: createRootRoute({ component: MeasurementPage }),
})
createRoot(root).render(<RouterProvider router={router} />)
