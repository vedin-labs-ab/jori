import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { createRoot } from "react-dom/client"
import { DemoConsole } from "@/landing/demo/console"
import { folderId } from "@/landing/demo/fixtures/folders"
import { jobId } from "@/landing/demo/fixtures/jobs"
import { renewalsTableId } from "@/landing/demo/fixtures/materials/tables"
import { useDemoNavigation } from "@/landing/demo/navigation"
import { DemoWorkspaceProvider } from "@/landing/demo/provider"
import { RenewalsThread } from "@/landing/home/hero/thread"
import { cn } from "@/lib/utils"
import { BrandMark } from "@/shared/brand"
import { brandHeadline } from "@/shared/brand/content"
import "@/styles.css"

const parameters = new URLSearchParams(window.location.search)
const square = parameters.get("format") === "square"
document.documentElement.classList.toggle(
  "dark",
  parameters.get("theme") === "dark"
)

export function SocialImage() {
  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-[oklch(0.975_0.005_153.5)] text-foreground dark:bg-[oklch(0.19_0.008_153.5)]"
      data-social-ready
    >
      <header className="absolute left-16 top-12">
        <BrandMark className={square ? "h-14" : "h-12"} />
      </header>
      <h1
        className={cn(
          "absolute left-16 text-balance font-medium tracking-[-0.045em]",
          square
            ? "top-[178px] max-w-[920px] text-[82px] leading-[1.06]"
            : "top-[135px] max-w-[1000px] text-[66px] leading-[1.04]"
        )}
      >
        {brandHeadline}
      </h1>
      <DemoWorkspaceProvider now={Date.UTC(2026, 8, 9, 9, 15)}>
        <ProductImage />
      </DemoWorkspaceProvider>
    </main>
  )
}

function ProductImage() {
  const console = useDemoNavigation(`/folders/${folderId("renewals")}`)

  return (
    <div
      className={cn(
        "absolute inset-x-16",
        square ? "top-[440px]" : "top-[324px]"
      )}
    >
      <DemoConsole
        className={square ? "h-[536px]" : "h-[450px]"}
        navigation={console}
      />
      <RenewalsThread
        className={cn(
          "absolute right-5 w-[390px]",
          square ? "top-[280px]" : "top-6"
        )}
        onOpenJob={() => console.navigation.navigate(`/jobs/${jobId("watch")}`)}
        onOpenTable={() =>
          console.navigation.navigate(`/tables/${renewalsTableId}`)
        }
      />
    </div>
  )
}

const root = document.getElementById("root")
if (root === null) {
  throw new Error("Missing social image root")
}
const router = createRouter({
  history: createMemoryHistory({ initialEntries: ["/"] }),
  routeTree: createRootRoute({ component: SocialImage }),
})
createRoot(root).render(<RouterProvider router={router} />)
