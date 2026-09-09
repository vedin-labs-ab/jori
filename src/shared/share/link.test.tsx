// @vitest-environment jsdom
import {
  createBrowserHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { useShareSecret } from "./link"

afterEach(() => {
  cleanup()
  window.history.replaceState(null, "", "/")
})

test("share secrets follow pushes, replacements, and history on the same URL", async () => {
  function Reader() {
    return <div data-testid="secret">{useShareSecret() ?? "none"}</div>
  }
  const history = createBrowserHistory()
  const router = createRouter({
    routeTree: createRootRoute({ component: Reader }),
    history,
  })
  render(<RouterProvider router={router} />)
  expect((await screen.findByTestId("secret")).textContent).toBe("none")
  await act(async () => {
    await router.navigate({ hash: "share=first" })
  })
  expect(screen.getByTestId("secret").textContent).toBe("first")
  await act(async () => {
    await router.navigate({ hash: "share=second", replace: true })
  })
  expect(screen.getByTestId("secret").textContent).toBe("second")
  await act(async () => {
    await router.navigate({ hash: "" })
  })
  expect(screen.getByTestId("secret").textContent).toBe("none")
  await act(async () => {
    history.back()
  })
  await screen.findByText("second")
  history.destroy()
})
