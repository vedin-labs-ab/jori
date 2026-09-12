// @vitest-environment jsdom
import { RouterProvider } from "@tanstack/react-router"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { useMaterialMode } from "@/console/frame/mode"
import { setup, sync, viewer } from "../../test/navigation"

test.each([
  "chat",
  "context",
  "files",
  "folders",
  "integrations",
  "stores",
  "tables",
])("an unknown path within %s keeps navigation mounted", async (section) => {
  const router = setup()
  render(<RouterProvider router={router} />)
  await screen.findByTestId("page")
  const header = document.querySelector("header")
  await act(async () => {
    await router.navigate({ href: `/${section}/missing/unknown` })
  })
  expect(await screen.findByText("Page not found")).toBeDefined()
  expect(document.querySelector("header")).toBe(header)
  fireEvent.click(screen.getByRole("link", { name: "Activity" }))
  expect(await screen.findByTestId("page")).toBeDefined()
  expect(document.querySelector("header")).toBe(header)
  expect(sync).toHaveBeenCalledTimes(1)
})

test.each(["search", "reload"])(
  "%s recovers a failed page without resetting the shell",
  async (navigation) => {
    const router = setup("/runs")
    let fails = true
    router.routesById["/_workspace/runs"].update({
      component: () => {
        if (fails) {
          throw new Error("Invalid run")
        }
        return <div>Recovered page</div>
      },
    })
    render(<RouterProvider router={router} />)
    await screen.findByText("This page didn't load")
    const header = document.querySelector("header")
    fails = false
    await act(async () => {
      if (navigation === "search") {
        await router.navigate({ to: "/runs", search: { page: 2 } })
      } else {
        await router.invalidate()
      }
    })
    expect(await screen.findByText("Recovered page")).toBeDefined()
    expect(document.querySelector("header")).toBe(header)
  }
)

test("the mobile sidebar closes after navigation while the header stays mounted", async () => {
  vi.mocked(window.matchMedia).mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList)
  const router = setup()
  render(<RouterProvider router={router} />)
  await screen.findByTestId("page")
  const header = document.querySelector("header")
  fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }))
  expect(await screen.findByRole("dialog")).toBeDefined()
  fireEvent.click(screen.getByRole("link", { name: "Activity" }))
  await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  expect(document.querySelector("header")).toBe(header)
  expect(sync).toHaveBeenCalledTimes(1)
})

test("anonymous material visits skip workspace initialization, but protected pages still gate", async () => {
  viewer.signedIn = false
  const router = setup("/tables/shared-table")
  function SharedPage() {
    return <div>{useMaterialMode()} access</div>
  }
  router.routesById["/_workspace/tables/$tableId/"].update({
    component: SharedPage,
  })
  render(<RouterProvider router={router} />)
  expect(await screen.findByText("share access")).toBeDefined()
  expect(document.querySelector('[data-slot="sidebar"]')).toBeNull()
  expect(sync).not.toHaveBeenCalled()
  await act(async () => {
    await router.navigate({ to: "/jobs" })
  })
  expect(await screen.findByRole("status", { name: "Loading" })).toBeDefined()
  expect(screen.queryByTestId("page")).toBeNull()
  expect(screen.queryByText("share access")).toBeNull()
  expect(sync).not.toHaveBeenCalled()
})
