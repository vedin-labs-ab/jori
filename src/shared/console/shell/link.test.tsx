// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ConsoleLink } from "./link"
import { ConsoleNavigationContext, useConsolePathname } from "./location"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
  useRouter: () => ({
    buildLocation: ({
      params,
      to,
    }: {
      params?: Record<string, string>
      to: string
    }) => {
      const pathname = Object.values(params ?? {}).reduce(
        (path, value) => path.replace(/\$\w+/, value),
        to
      )

      return { href: pathname, pathname }
    },
  }),
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown
  }) => select({ location: { pathname: "/runs" } }),
}))

afterEach(cleanup)

function renderLocal(navigate: (href: string) => void) {
  render(
    <ConsoleNavigationContext.Provider value={{ navigate, pathname: "/runs" }}>
      <ConsoleLink params={{ folderId: "finance" }} to="/folders/$folderId">
        Finance
      </ConsoleLink>
    </ConsoleNavigationContext.Provider>
  )

  return screen.getByRole("link", { name: "Finance" })
}

test("under the router it is the router's own link", () => {
  render(
    <ConsoleLink params={{ folderId: "finance" }} to="/folders/$folderId">
      Finance
    </ConsoleLink>
  )

  expect(
    screen.getByRole("link", { name: "Finance" }).getAttribute("href")
  ).toBe("/folders/finance")
})

test("under a local navigation a plain click goes to the navigation", () => {
  const navigate = vi.fn()
  const link = renderLocal(navigate)

  // A real href, so the link reads and copies like one; the click itself
  // stays out of the browser's hands.
  expect(link.getAttribute("href")).toBe("/folders/finance")
  expect(fireEvent.click(link)).toBe(false)
  expect(navigate).toHaveBeenCalledWith("/folders/finance")
})

test("a modified click is the browser's to open a new tab with", () => {
  const navigate = vi.fn()
  const link = renderLocal(navigate)

  expect(fireEvent.click(link, { metaKey: true })).toBe(true)
  expect(navigate).not.toHaveBeenCalled()
})

test("the pathname is the navigation's when one is in force", () => {
  function Pathname() {
    return <span>{useConsolePathname()}</span>
  }

  render(
    <ConsoleNavigationContext.Provider
      value={{ navigate: () => undefined, pathname: "/folders" }}
    >
      <Pathname />
    </ConsoleNavigationContext.Provider>
  )

  expect(screen.getByText("/folders")).toBeDefined()
  cleanup()
  render(<Pathname />)
  expect(screen.getByText("/runs")).toBeDefined()
})
