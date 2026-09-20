// @vitest-environment jsdom
import { RouterProvider } from "@tanstack/react-router"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { lazy } from "react"
import { expect, test, vi } from "vitest"
import { activeFolderId } from "@/shared/console/folders/tree"
import { isNavigationActive } from "@/shared/console/shell/routes"
import { setup, sync } from "../../test/navigation"

const paths = [
  "/runs",
  "/chat",
  "/chat/conversation",
  "/folders",
  "/folders/folder",
  "/folders/folder/usage",
  "/jobs/job",
  "/tables",
  "/tables/table",
  "/stores",
  "/stores/store",
  "/files",
  "/files/file",
  "/context",
  "/context/places",
  "/skills",
  "/integrations",
  "/integrations/personal",
]

test("one shell and identity sync survive navigation across every workspace section and browser history", async () => {
  const router = setup()
  render(<RouterProvider router={router} />)
  await screen.findByTestId("page")
  const frame = document.querySelector('[data-slot="sidebar-inset"]')
  const sidebar = document.querySelector('[data-slot="sidebar"]')
  expect(frame).not.toBeNull()
  expect(sidebar).not.toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Close sidebar" }))
  const sidebarState = sidebar?.getAttribute("data-state")
  for (const path of paths) {
    await act(async () => {
      await router.navigate({ to: path })
    })
    expect(screen.getByTestId("page")).toBeDefined()
    expect(document.querySelector('[data-slot="sidebar-inset"]')).toBe(frame)
    expect(document.querySelector('[data-slot="sidebar"]')).toBe(sidebar)
    expect(sidebar?.getAttribute("data-state")).toBe(sidebarState)
    // One header slot, so one action; New chat has no header to hold one.
    expect(
      screen.queryAllByRole("button", { name: "Page action" })
    ).toHaveLength(path === "/chat" ? 0 : 1)
    expect(sync).toHaveBeenCalledTimes(1)
  }
  await act(async () => {
    router.history.back()
  })
  await vi.waitFor(() =>
    expect(router.state.location.pathname).toBe("/integrations")
  )
  await act(async () => {
    router.history.forward()
  })
  await vi.waitFor(() =>
    expect(router.state.location.pathname).toBe("/integrations/personal")
  )
  expect(document.querySelector('[data-slot="sidebar-inset"]')).toBe(frame)
  expect(sync).toHaveBeenCalledTimes(1)
  await vi.waitFor(() =>
    expect(screen.queryByRole("status", { name: "Loading" })).toBeNull()
  )
})

test("a cold page chunk loads inside the shell and can be abandoned", async () => {
  const router = setup()
  let finish: (module: { default: () => null }) => void = () => undefined
  const chunk = new Promise<{ default: () => null }>((resolve) => {
    finish = resolve
  })
  router.routesById["/_workspace/skills"].update({
    component: lazy(() => chunk),
  })
  render(<RouterProvider router={router} />)
  await screen.findByTestId("page")
  await vi.waitFor(() =>
    expect(screen.queryByRole("status", { name: "Loading" })).toBeNull()
  )
  const frame = document.querySelector('[data-slot="sidebar-inset"]')
  await act(async () => {
    await router.navigate({ to: "/skills" })
  })
  expect(
    await screen.findByRole("status", { name: "Loading page" })
  ).toBeDefined()
  expect(document.querySelector('[data-slot="sidebar-inset"]')).toBe(frame)
  expect(screen.queryByRole("status", { name: "Loading" })).toBeNull()
  expect(screen.queryByRole("button", { name: "Page action" })).toBeNull()
  await act(async () => {
    await router.navigate({ to: "/runs" })
  })
  expect(await screen.findByTestId("page")).toBeDefined()
  await act(async () => {
    finish({ default: () => null })
  })
  expect(document.querySelector('[data-slot="sidebar-inset"]')).toBe(frame)
  expect(sync).toHaveBeenCalledTimes(1)
})

test("page errors leave navigation usable and clear on the next route", async () => {
  const router = setup()
  const error = new Error("Page query failed")
  const onCaughtError = vi.fn()
  router.routesById["/_workspace/skills"].update({
    component: () => {
      throw error
    },
  })
  render(<RouterProvider router={router} />, { onCaughtError })
  await screen.findByTestId("page")
  const frame = document.querySelector('[data-slot="sidebar-inset"]')
  await act(async () => {
    await router.navigate({ to: "/skills" })
  })
  expect(await screen.findByText("This page didn't load")).toBeDefined()
  expect(onCaughtError.mock.calls.map(([caught]) => caught)).toEqual([error])
  expect(document.querySelector('[data-slot="sidebar-inset"]')).toBe(frame)
  fireEvent.click(screen.getByRole("link", { name: "Activity" }))
  expect(await screen.findByTestId("page")).toBeDefined()
  expect(screen.queryByText("This page didn't load")).toBeNull()
  expect(document.querySelector('[data-slot="sidebar-inset"]')).toBe(frame)
})

test("a slow route loader keeps the shell usable until it resolves", async () => {
  const router = setup()
  let finish: () => void = () => undefined
  const loading = new Promise<void>((resolve) => {
    finish = resolve
  })
  Object.assign(router.routesById["/_workspace/skills"].options, {
    loader: () => loading,
  })
  render(<RouterProvider router={router} />)
  await screen.findByTestId("page")
  await vi.waitFor(() =>
    expect(screen.queryByRole("status", { name: "Loading" })).toBeNull()
  )
  const frame = document.querySelector('[data-slot="sidebar-inset"]')
  let navigation: Promise<void> | undefined
  await act(async () => {
    navigation = router.navigate({ to: "/skills" })
  })
  expect(router.state.isLoading).toBe(true)
  expect(screen.getByTestId("page")).toBeDefined()
  expect(document.querySelector('[data-slot="sidebar-inset"]')).toBe(frame)
  expect(screen.queryByRole("status", { name: "Loading" })).toBeNull()
  await act(async () => {
    finish()
    await navigation
  })
  expect(await screen.findByTestId("page")).toBeDefined()
  expect(document.querySelector('[data-slot="sidebar-inset"]')).toBe(frame)
})

test("search-only navigation keeps the page and shell mounted", async () => {
  const router = setup("/runs")
  render(<RouterProvider router={router} />)
  await screen.findByTestId("page")
  const frame = document.querySelector('[data-slot="sidebar-inset"]')
  const page = screen.getByTestId("page")
  await act(async () => {
    await router.navigate({ to: "/runs", search: { page: 2, run: "run-id" } })
  })
  expect(screen.getByTestId("page")).toBe(page)
  expect(document.querySelector('[data-slot="sidebar-inset"]')).toBe(frame)
  expect(sync).toHaveBeenCalledTimes(1)
})

test("sign-in, marketing, and integration offers stay outside the workspace layout", () => {
  const router = setup()
  for (const path of [
    "/",
    "/pricing",
    "/sign-in",
    "/sign-out",
    "/integrations/offers/token",
  ]) {
    expect(
      router.matchRoutes(path).some((match) => match.routeId === "/_workspace")
    ).toBe(false)
  }
})

test("chat and folder index routes keep their sidebar item active", () => {
  const router = setup()
  const chatPath = router.matchRoutes("/chat/conversation").at(-1)?.pathname
  const folderPath = router.matchRoutes("/folders/folder").at(-1)?.pathname

  expect(isNavigationActive(chatPath ?? "", "/chat/conversation", true)).toBe(
    true
  )
  expect(activeFolderId(folderPath ?? "")).toBe("folder")
})
