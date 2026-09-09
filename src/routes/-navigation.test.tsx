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
  "/context/workstreams",
  "/skills",
  "/integrations",
  "/integrations/personal",
]

test("one shell and identity sync survive navigation across every workspace section and browser history", async () => {
  const router = setup()
  render(<RouterProvider router={router} />)
  await screen.findByTestId("page")
  const header = document.querySelector("header")
  const sidebar = document.querySelector('[data-slot="sidebar"]')
  expect(header).not.toBeNull()
  expect(sidebar).not.toBeNull()
  fireEvent.click(screen.getAllByRole("button", { name: "Toggle Sidebar" })[0])
  const sidebarState = sidebar?.getAttribute("data-state")
  for (const path of paths) {
    await act(async () => {
      await router.navigate({ to: path })
    })
    expect(screen.getByTestId("page")).toBeDefined()
    expect(document.querySelector("header")).toBe(header)
    expect(document.querySelector('[data-slot="sidebar"]')).toBe(sidebar)
    expect(sidebar?.getAttribute("data-state")).toBe(sidebarState)
    expect(screen.getAllByRole("button", { name: "Page action" })).toHaveLength(
      1
    )
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
  expect(document.querySelector("header")).toBe(header)
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
  const header = document.querySelector("header")
  await act(async () => {
    await router.navigate({ to: "/skills" })
  })
  expect(
    await screen.findByRole("status", { name: "Loading page" })
  ).toBeDefined()
  expect(document.querySelector("header")).toBe(header)
  expect(screen.queryByRole("status", { name: "Loading" })).toBeNull()
  expect(screen.queryByRole("button", { name: "Page action" })).toBeNull()
  await act(async () => {
    await router.navigate({ to: "/runs" })
  })
  expect(await screen.findByTestId("page")).toBeDefined()
  await act(async () => {
    finish({ default: () => null })
  })
  expect(document.querySelector("header")).toBe(header)
  expect(sync).toHaveBeenCalledTimes(1)
})

test("page errors leave navigation usable and clear on the next route", async () => {
  const router = setup()
  router.routesById["/_workspace/skills"].update({
    component: () => {
      throw new Error("Page query failed")
    },
  })
  render(<RouterProvider router={router} />)
  await screen.findByTestId("page")
  const header = document.querySelector("header")
  await act(async () => {
    await router.navigate({ to: "/skills" })
  })
  expect(await screen.findByText("This page didn't load")).toBeDefined()
  expect(document.querySelector("header")).toBe(header)
  fireEvent.click(screen.getByRole("link", { name: "Activity" }))
  expect(await screen.findByTestId("page")).toBeDefined()
  expect(screen.queryByText("This page didn't load")).toBeNull()
  expect(document.querySelector("header")).toBe(header)
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
  const header = document.querySelector("header")
  let navigation: Promise<void> | undefined
  await act(async () => {
    navigation = router.navigate({ to: "/skills" })
  })
  expect(router.state.isLoading).toBe(true)
  expect(screen.getByTestId("page")).toBeDefined()
  expect(document.querySelector("header")).toBe(header)
  expect(screen.queryByRole("status", { name: "Loading" })).toBeNull()
  await act(async () => {
    finish()
    await navigation
  })
  expect(await screen.findByTestId("page")).toBeDefined()
  expect(document.querySelector("header")).toBe(header)
})

test("search-only navigation keeps the page and shell mounted", async () => {
  const router = setup("/runs")
  render(<RouterProvider router={router} />)
  await screen.findByTestId("page")
  const header = document.querySelector("header")
  const page = screen.getByTestId("page")
  await act(async () => {
    await router.navigate({ to: "/runs", search: { page: 2, run: "run-id" } })
  })
  expect(screen.getByTestId("page")).toBe(page)
  expect(document.querySelector("header")).toBe(header)
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
