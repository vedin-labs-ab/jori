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
    select: (state: {
      location: { pathname: string }
      matches: { pathname: string }[]
      loadedAt: number
    }) => unknown
  }) =>
    select({
      location: { pathname: "/runs" },
      matches: [{ pathname: "/runs" }],
      loadedAt: 0,
    }),
}))

afterEach(cleanup)

function renderLocal(navigate: (href: string) => void) {
  render(
    <ConsoleNavigationContext.Provider
      value={{ anchor: "demo", navigate, pathname: "/runs" }}
    >
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

  // Copied links stay at the public demo instead of exposing fixture URLs.
  expect(link.getAttribute("href")).toBe("#demo")
  expect(fireEvent.click(link)).toBe(false)
  expect(navigate).toHaveBeenCalledWith("/folders/finance")
})

test("a modified click is the browser's to open a new tab with", () => {
  const navigate = vi.fn()
  const link = renderLocal(navigate)

  // Observe the event after React handles it, then stop jsdom from trying
  // to open a document. The application must leave this browser action alone.
  const browserClick = vi.fn((event: MouseEvent) => {
    const prevented = event.defaultPrevented
    event.preventDefault()
    return prevented
  })
  document.addEventListener("click", browserClick, { once: true })
  fireEvent.click(link, { metaKey: true })
  expect(browserClick).toHaveReturnedWith(false)
  expect(navigate).not.toHaveBeenCalled()
})

test("the pathname is the navigation's when one is in force", () => {
  function Pathname() {
    return <span>{useConsolePathname()}</span>
  }

  render(
    <ConsoleNavigationContext.Provider
      value={{
        anchor: "demo",
        navigate: () => undefined,
        pathname: "/folders",
      }}
    >
      <Pathname />
    </ConsoleNavigationContext.Provider>
  )

  expect(screen.getByText("/folders")).toBeDefined()
  cleanup()
  render(<Pathname />)
  expect(screen.getByText("/runs")).toBeDefined()
})
