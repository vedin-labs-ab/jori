import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"
import { FullscreenLoadingProvider, FullscreenSkeletonLoader } from "./loading"

describe("fullscreen loading", () => {
  test("renders the protected-route loader in the server response", () => {
    const html = renderToStaticMarkup(
      <FullscreenLoadingProvider initiallyVisible>
        <FullscreenSkeletonLoader />
      </FullscreenLoadingProvider>
    )

    expect(html).toContain("opacity-100")
    expect(html).not.toContain("fade-in-0")
  })

  test("keeps the shared overlay dormant without bootstrap loading", () => {
    const html = renderToStaticMarkup(
      <FullscreenLoadingProvider>
        <main>Ready</main>
      </FullscreenLoadingProvider>
    )

    expect(html).toContain("opacity-0")
    expect(html).toContain("Ready")
  })

  test("shows a standalone loader immediately", () => {
    const html = renderToStaticMarkup(<FullscreenSkeletonLoader />)

    expect(html).toContain("opacity-100")
    expect(html).not.toContain("transition-opacity")
  })
})
