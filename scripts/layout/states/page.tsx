import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { createRoot } from "react-dom/client"
import { DemoDragProvider } from "@/landing/demo/drag"
import { useDemoNavigation } from "@/landing/demo/navigation"
import { DemoWorkspaceProvider } from "@/landing/demo/provider"
import { DemoSidebar } from "@/landing/demo/sidebar"
import { ConsoleFrame } from "@/shared/console/shell/frame"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { AccessState } from "./access"
import { CreationState } from "./creation"
import { PendingDialog } from "./dialog"
import { GridStates } from "./grid"
import { JobState } from "./jobs"
import { ListStates } from "./lists"
import { MoveState } from "./move"
import { OnboardingState } from "./onboarding"
import "@/styles.css"

export function StatePage() {
  const state = new URLSearchParams(location.search).get("case") ?? "ready"
  const { navigation } = useDemoNavigation("/tables")

  if (state.startsWith("onboarding-")) {
    return <OnboardingState state={state} />
  }

  return (
    <DemoWorkspaceProvider now={Date.UTC(2026, 8, 9, 9, 15)}>
      <ConsoleNavigationContext.Provider value={navigation}>
        <DemoDragProvider>
          <ConsoleFrame
            pathname="/tables"
            sidebar={<DemoSidebar pathname="/tables" />}
          >
            {state.startsWith("grid-") ? (
              <GridStates state={state} />
            ) : (
              <ListStates state={state} />
            )}
            {state.startsWith("save-") ? <PendingDialog state={state} /> : null}
            {state.startsWith("create-") ? (
              <CreationState state={state} />
            ) : null}
            {state.startsWith("jobs-") ? <JobState state={state} /> : null}
            {state.startsWith("access-") ? <AccessState state={state} /> : null}
            {state.startsWith("move-") ? <MoveState state={state} /> : null}
          </ConsoleFrame>
        </DemoDragProvider>
      </ConsoleNavigationContext.Provider>
    </DemoWorkspaceProvider>
  )
}

const root = document.getElementById("root")
if (!root) {
  throw new Error("Missing layout state root")
}
const router = createRouter({
  history: createMemoryHistory({ initialEntries: ["/"] }),
  routeTree: createRootRoute({ component: StatePage }),
})
createRoot(root).render(<RouterProvider router={router} />)
